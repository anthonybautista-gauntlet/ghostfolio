import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EvalApiResponse, EvalCase } from './run-eval-dataset';

interface ReplayFixtureFile {
  fixtures: {
    case: EvalCase;
    response: EvalApiResponse;
  }[];
}

async function run() {
  const fixturePathCandidates = [
    process.env.AGENTFORGE_REPLAY_FIXTURE_PATH,
    'eval-history/replay/fixtures-latest.json',
    'libs/ghostagent-evals/src/lib/staged/golden-deterministic-fixtures.json'
  ]
    .filter(Boolean)
    .map((fixturePath) => resolve(process.cwd(), fixturePath!));
  const fixturePath = fixturePathCandidates.find((candidatePath) =>
    existsSync(candidatePath)
  );
  const latencyThresholdMs = Number(
    process.env.AGENTFORGE_EVAL_MAX_LATENCY_MS ?? '15000'
  );
  if (!fixturePath) {
    throw new Error(
      `Replay fixture not found. Checked: ${fixturePathCandidates.join(', ')}`
    );
  }
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
  ) as ReplayFixtureFile;
  const perCase = fixtureFile.fixtures.map((fixture) => {
    const score = scoreCase({
      latencyThresholdMs,
      response: fixture.response,
      testCase: fixture.case
    });
    const checkValues = Object.values(score.checks);
    const consistencyRatio =
      checkValues.filter(Boolean).length / Math.max(checkValues.length, 1);

    return {
      caseId: fixture.case.id,
      checks: score.checks,
      consistencyRatio,
      pass: score.pass
    };
  });
  const passRate =
    perCase.filter((item) => item.pass).length / Math.max(perCase.length, 1);
  const consistencyRate =
    perCase.reduce((total, item) => total + item.consistencyRatio, 0) /
    Math.max(perCase.length, 1);

  console.log(
    JSON.stringify(
      {
        consistencyRate,
        fixturePath,
        passRate,
        perCase,
        total: perCase.length
      },
      null,
      2
    )
  );
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown replay run error';
  console.error(message);
  process.exit(1);
});
