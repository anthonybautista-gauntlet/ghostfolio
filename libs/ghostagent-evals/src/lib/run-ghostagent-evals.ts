import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface EvalCase {
  category: 'adversarial' | 'edge' | 'happy' | 'multi_step';
  expectedRequestOk?: boolean;
  expectedOutput?: {
    mustContainAll?: string[];
    mustContainAny?: string[];
    mustNotContain?: string[];
  };
  expectedTools: string[];
  id: string;
  query: string;
}

interface EvalApiResponse {
  confidence: 'high' | 'low' | 'medium';
  disclaimer: string;
  message: string;
  sessionId: string;
  timings?: { totalMs: number };
  toolInvocations?: { ok: boolean; tool: string }[];
  verification?: { passed: boolean };
}

interface EvalScore {
  checks: Record<string, boolean>;
  pass: boolean;
}

interface EvalHistorySnapshot {
  createdAt: string;
  passRate: number;
  passed: number;
  summaryByCategory: Record<string, { passed: number; total: number }>;
  total: number;
}

function toCompactTimestamp(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function getPreviousHistorySnapshot({
  historyDirectoryPath
}: {
  historyDirectoryPath: string;
}) {
  try {
    const fileNames = (await readdir(historyDirectoryPath))
      .filter((fileName) => fileName.endsWith('.json'))
      .sort();
    const latestFileName = fileNames[fileNames.length - 1];

    if (!latestFileName) {
      return undefined;
    }

    const latestContent = await readFile(
      resolve(historyDirectoryPath, latestFileName),
      'utf8'
    );

    return JSON.parse(latestContent) as EvalHistorySnapshot;
  } catch {
    return undefined;
  }
}

async function run() {
  const scorerModuleUrl = pathToFileURL(
    resolve(
      process.cwd(),
      'libs/ghostagent-evals/src/lib/scorers/ghostagent-scorer.ts'
    )
  ).href;
  const { scoreCase } = (await import(scorerModuleUrl)) as {
    scoreCase: (args: {
      latencyThresholdMs: number;
      response: EvalApiResponse;
      testCase: EvalCase;
    }) => EvalScore;
  };

  const evalApiUrl = process.env.AGENTFORGE_EVAL_API_URL;
  const evalApiToken = process.env.AGENTFORGE_EVAL_API_TOKEN;
  const datasetPathOverride = process.env.AGENTFORGE_EVAL_DATASET_PATH;
  const passRateThreshold = Number(
    process.env.AGENTFORGE_EVAL_PASS_THRESHOLD ?? '0.8'
  );
  const latencyThresholdMs = Number(
    process.env.AGENTFORGE_EVAL_MAX_LATENCY_MS ?? '15000'
  );

  if (!evalApiUrl || !evalApiToken) {
    throw new Error(
      'Missing AGENTFORGE_EVAL_API_URL or AGENTFORGE_EVAL_API_TOKEN environment variables.'
    );
  }

  const datasetPath = resolve(
    process.cwd(),
    datasetPathOverride ??
      'libs/ghostagent-evals/src/lib/dataset/ghostagent-eval-cases.json'
  );
  const rawDataset = await readFile(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawDataset) as EvalCase[];

  let passed = 0;
  const results: {
    caseId: string;
    category: EvalCase['category'];
    checks: Record<string, boolean>;
    failedChecks: string[];
    pass: boolean;
    totalMs: number;
  }[] = [];

  for (const testCase of dataset) {
    const startedAt = Date.now();
    let response: EvalApiResponse;

    try {
      const apiResponse = await fetch(
        `${evalApiUrl.replace(/\/$/, '')}/api/v1/ai/chat`,
        {
          body: JSON.stringify({
            message: testCase.query
          }),
          headers: {
            Authorization: `Bearer ${evalApiToken}`,
            'Content-Type': 'application/json'
          },
          method: 'POST'
        }
      );

      if (!apiResponse.ok) {
        throw new Error(
          `HTTP ${apiResponse.status}: ${await apiResponse.text()}`
        );
      }

      response = (await apiResponse.json()) as EvalApiResponse;
    } catch {
      const expectedRequestOk = testCase.expectedRequestOk ?? true;
      results.push({
        caseId: testCase.id,
        category: testCase.category,
        checks: { request_ok: false },
        failedChecks: ['request_ok'],
        pass: expectedRequestOk === false,
        totalMs: Date.now() - startedAt
      });
      continue;
    }

    if (testCase.expectedRequestOk === false) {
      results.push({
        caseId: testCase.id,
        category: testCase.category,
        checks: { request_ok: true },
        failedChecks: ['request_should_have_failed'],
        pass: false,
        totalMs: response.timings?.totalMs ?? Date.now() - startedAt
      });
      continue;
    }

    const score = scoreCase({
      latencyThresholdMs,
      response,
      testCase
    });
    if (score.pass) {
      passed += 1;
    }

    results.push({
      caseId: testCase.id,
      category: testCase.category,
      checks: score.checks,
      failedChecks: Object.entries(score.checks)
        .filter(([, ok]) => !ok)
        .map(([checkName]) => checkName),
      pass: score.pass,
      totalMs: response.timings?.totalMs ?? Date.now() - startedAt
    });
  }

  const passRate = passed / dataset.length;
  const summaryByCategory = results.reduce<
    Record<string, { passed: number; total: number }>
  >((accumulator, result) => {
    const current = accumulator[result.category] ?? { passed: 0, total: 0 };
    current.total += 1;
    if (result.pass) {
      current.passed += 1;
    }
    accumulator[result.category] = current;
    return accumulator;
  }, {});

  const report = {
    passRate,
    passRateThreshold,
    passed,
    slowestCases: [...results]
      .sort((left, right) => right.totalMs - left.totalMs)
      .slice(0, 5)
      .map(({ caseId, category, totalMs }) => ({
        caseId,
        category,
        totalMs
      })),
    summaryByCheck: results.reduce<
      Record<string, { failed: number; total: number }>
    >((accumulator, result) => {
      for (const [checkName, passedCheck] of Object.entries(result.checks)) {
        const current = accumulator[checkName] ?? { failed: 0, total: 0 };
        current.total += 1;
        if (!passedCheck) {
          current.failed += 1;
        }
        accumulator[checkName] = current;
      }
      return accumulator;
    }, {}),
    summaryByCategory,
    total: dataset.length
  };

  const historyDirectoryPath = resolve(process.cwd(), 'eval-history');
  const previousSnapshot = await getPreviousHistorySnapshot({
    historyDirectoryPath
  });
  const historySnapshot: EvalHistorySnapshot = {
    createdAt: new Date().toISOString(),
    passRate,
    passed,
    summaryByCategory,
    total: dataset.length
  };
  const passRateDelta = previousSnapshot
    ? Number((passRate - previousSnapshot.passRate).toFixed(4))
    : null;
  const reportWithDelta = {
    ...report,
    regression: {
      passRateDelta,
      previousPassRate: previousSnapshot?.passRate ?? null
    }
  };

  await mkdir(historyDirectoryPath, { recursive: true });
  await writeFile(
    resolve(historyDirectoryPath, `${toCompactTimestamp()}.json`),
    JSON.stringify(historySnapshot, null, 2),
    'utf8'
  );

  console.log(JSON.stringify({ report: reportWithDelta, results }, null, 2));

  if (passRate < passRateThreshold) {
    process.exit(1);
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown eval runner error';
  console.error(message);
  process.exit(1);
});
