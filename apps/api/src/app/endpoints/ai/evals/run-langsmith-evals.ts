import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface EvalCase {
  category: 'adversarial' | 'edge' | 'happy' | 'multi_step';
  expectedRequestOk?: boolean;
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

async function run() {
  // Dynamic import keeps ts-node/ESM module resolution stable in this workspace.
  const scorerModuleUrl = pathToFileURL(
    resolve(
      process.cwd(),
      'apps/api/src/app/endpoints/ai/evals/scorers/agentforge-scorer.ts'
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
    'apps/api/src/app/endpoints/ai/evals/dataset/agentforge-eval-cases.json'
  );
  const rawDataset = await readFile(datasetPath, 'utf-8');
  const dataset = JSON.parse(rawDataset) as EvalCase[];

  let passed = 0;
  const results: {
    caseId: string;
    category: EvalCase['category'];
    checks: Record<string, boolean>;
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
    } catch (error: unknown) {
      const expectedRequestOk = testCase.expectedRequestOk ?? true;
      results.push({
        caseId: testCase.id,
        category: testCase.category,
        checks: { request_ok: false },
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
    summaryByCategory,
    total: dataset.length
  };

  console.log(JSON.stringify({ report, results }, null, 2));

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
