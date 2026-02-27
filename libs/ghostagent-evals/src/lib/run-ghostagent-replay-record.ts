import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { EvalCase } from './run-eval-dataset';

async function run() {
  const evalApiUrl = process.env.AGENTFORGE_EVAL_API_URL;
  const evalApiToken = process.env.AGENTFORGE_EVAL_API_TOKEN;
  const datasetPath = resolve(
    process.cwd(),
    process.env.AGENTFORGE_REPLAY_DATASET_PATH ??
      'libs/ghostagent-evals/src/lib/staged/golden-cases.json'
  );

  if (!evalApiUrl || !evalApiToken) {
    throw new Error(
      'Missing AGENTFORGE_EVAL_API_URL or AGENTFORGE_EVAL_API_TOKEN environment variables.'
    );
  }

  const dataset = JSON.parse(await readFile(datasetPath, 'utf8')) as EvalCase[];
  const fixtures: {
    case: EvalCase;
    recordedAt: string;
    response: unknown;
  }[] = [];

  for (const testCase of dataset) {
    const response = await fetch(
      `${evalApiUrl.replace(/\/$/, '')}/api/v1/ai/chat`,
      {
        body: JSON.stringify({ message: testCase.query }),
        headers: {
          Authorization: `Bearer ${evalApiToken}`,
          'Content-Type': 'application/json'
        },
        method: 'POST'
      }
    );

    if (!response.ok) {
      continue;
    }

    fixtures.push({
      case: testCase,
      recordedAt: new Date().toISOString(),
      response: await response.json()
    });
  }

  const outputDirectory = resolve(process.cwd(), 'eval-history', 'replay');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, 'fixtures-latest.json'),
    JSON.stringify(
      {
        datasetPath,
        fixtures,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(
    JSON.stringify(
      {
        fixtureCount: fixtures.length,
        outputPath: resolve(outputDirectory, 'fixtures-latest.json')
      },
      null,
      2
    )
  );
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown replay record error';
  console.error(message);
  process.exit(1);
});
