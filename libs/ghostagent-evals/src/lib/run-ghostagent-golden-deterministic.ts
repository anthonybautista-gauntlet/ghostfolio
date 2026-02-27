import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EvalApiResponse, EvalCase } from './run-eval-dataset';

function shouldEnforceThreshold() {
  return process.env.AGENTFORGE_EVAL_ENFORCE_THRESHOLD === 'true';
}

interface GoldenFixtureFile {
  fixtures: {
    case: EvalCase;
    response: EvalApiResponse;
  }[];
}

async function run() {
  const fixturePath = resolve(
    process.cwd(),
    process.env.AGENTFORGE_DETERMINISTIC_GOLDEN_FIXTURE_PATH ??
      'libs/ghostagent-evals/src/lib/staged/golden-deterministic-fixtures.json'
  );
  const passRateThreshold = Number(
    process.env.AGENTFORGE_EVAL_PASS_THRESHOLD ?? '0.8'
  );
  const latencyThresholdMs = Number(
    process.env.AGENTFORGE_EVAL_MAX_LATENCY_MS ?? '15000'
  );
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
    }) => { checks: Record<string, boolean>; pass: boolean };
  };

  const fixtureFile = JSON.parse(
    await readFile(fixturePath, 'utf8')
  ) as GoldenFixtureFile;
  const results = fixtureFile.fixtures.map((fixture) => {
    const score = scoreCase({
      latencyThresholdMs,
      response: fixture.response,
      testCase: fixture.case
    });

    return {
      caseId: fixture.case.id,
      category: fixture.case.category,
      checks: score.checks,
      failedChecks: Object.entries(score.checks)
        .filter(([, ok]) => !ok)
        .map(([checkName]) => checkName),
      pass: score.pass,
      totalMs: fixture.response.timings?.totalMs ?? 0
    };
  });
  const passed = results.filter((result) => result.pass).length;
  const passRate = passed / Math.max(results.length, 1);
  const report = {
    fixturePath,
    passRate,
    passRateThreshold,
    passed,
    total: results.length
  };

  console.log(
    JSON.stringify(
      {
        report,
        results
      },
      null,
      2
    )
  );

  if (shouldEnforceThreshold() && passRate < passRateThreshold) {
    process.exit(1);
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown deterministic golden runner error';
  console.error(message);
  process.exit(1);
});
