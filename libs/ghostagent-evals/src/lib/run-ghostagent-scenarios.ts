import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EvalCase } from './run-eval-dataset';

function shouldEnforceThreshold() {
  return process.env.AGENTFORGE_EVAL_ENFORCE_THRESHOLD === 'true';
}

interface ScenarioCase {
  difficulty?: string;
  enforce_tool_sequence?: boolean;
  expected_tools?: string[];
  id: string;
  must_contain?: string[];
  must_not_contain?: string[];
  query: string;
}

interface ScenarioConfig {
  scenarios: Record<string, Record<string, ScenarioCase[]>>;
}

function inferCategory({
  parentKey,
  subKey
}: {
  parentKey: string;
  subKey: string;
}) {
  if (parentKey === 'multi_tool') {
    return 'multi_step';
  }
  if (parentKey === 'edge_cases') {
    if (subKey.includes('adversarial')) {
      return 'adversarial';
    }
    return 'edge';
  }
  return 'happy';
}

async function run() {
  const evalDatasetModuleUrl = pathToFileURL(
    resolve(process.cwd(), 'libs/ghostagent-evals/src/lib/run-eval-dataset.ts')
  ).href;
  const loadYamlModuleUrl = pathToFileURL(
    resolve(process.cwd(), 'libs/ghostagent-evals/src/lib/staged/load-yaml.ts')
  ).href;
  const { runEvalDataset } = (await import(evalDatasetModuleUrl)) as {
    runEvalDataset: (args: {
      datasetPathOverride: string;
    }) => Promise<{ report: Record<string, unknown>; results: unknown[] }>;
  };
  const { loadYamlFile } = (await import(loadYamlModuleUrl)) as {
    loadYamlFile: <T>(args: { path: string }) => Promise<T>;
  };
  const config = await loadYamlFile<ScenarioConfig>({
    path: resolve(
      process.cwd(),
      'libs/ghostagent-evals/src/lib/staged/scenarios.yaml'
    )
  });
  const sliceFilter = process.env.AGENTFORGE_SCENARIO_SLICE;
  const difficultyFilter = process.env.AGENTFORGE_SCENARIO_DIFFICULTY;
  const scenarioCases: EvalCase[] = [];

  for (const [parentKey, scenarioGroups] of Object.entries(
    config.scenarios ?? {}
  )) {
    if (sliceFilter && parentKey !== sliceFilter) {
      continue;
    }

    for (const [subKey, items] of Object.entries(scenarioGroups ?? {})) {
      for (const item of items) {
        if (difficultyFilter && item.difficulty !== difficultyFilter) {
          continue;
        }

        scenarioCases.push({
          category: inferCategory({
            parentKey,
            subKey
          }) as EvalCase['category'],
          enforceToolSequence: item.enforce_tool_sequence ?? false,
          expectedOutput: {
            mustContainAny: item.must_contain ?? [],
            mustNotContain: item.must_not_contain ?? []
          },
          expectedTools: item.expected_tools ?? [],
          id: item.id,
          query: item.query
        });
      }
    }
  }

  const tempDirectory = await mkdtemp(
    resolve(tmpdir(), 'ghostagent-scenarios-')
  );
  const tempDatasetPath = resolve(tempDirectory, 'dataset.json');
  await writeFile(
    tempDatasetPath,
    JSON.stringify(scenarioCases, null, 2),
    'utf8'
  );

  try {
    const result = await runEvalDataset({
      datasetPathOverride: tempDatasetPath
    });
    const historyDirectoryPath = resolve(process.cwd(), 'eval-history');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await mkdir(historyDirectoryPath, { recursive: true });
    await writeFile(
      resolve(historyDirectoryPath, `scenarios-${timestamp}.json`),
      JSON.stringify(result, null, 2),
      'utf8'
    );
    console.log(JSON.stringify(result, null, 2));

    if (
      shouldEnforceThreshold() &&
      (result.report.passRate as number) <
        (result.report.passRateThreshold as number)
    ) {
      process.exit(1);
    }
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown scenario eval runner error';
  console.error(message);
  process.exit(1);
});
