import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EvalCase } from './run-eval-dataset';

interface RubricConfig {
  category_weights?: Record<string, Record<string, number>>;
  dimensions: Record<string, { weight: number }>;
  scale?: { max_score?: number };
  test_cases: {
    category?: string;
    expected_tools?: string[];
    id: string;
    query: string;
  }[];
  thresholds?: Record<string, number>;
}

function toDimensionScores({
  checks,
  maxScore
}: {
  checks: Record<string, boolean>;
  maxScore: number;
}) {
  const relevanceChecks = [checks.expected_tools, checks.response_has_message];
  const accuracyChecks = [
    checks.verification_present,
    checks.output_must_not_contain,
    checks.output_must_contain_all
  ];
  const completenessChecks = [
    checks.output_must_contain_any,
    checks.expected_tool_sequence
  ];
  const clarityChecks = [
    checks.response_has_message,
    checks.disclaimer_present
  ];
  const scoreFromChecks = (values: (boolean | undefined)[]) => {
    const filtered = values.filter(
      (value) => typeof value === 'boolean'
    ) as boolean[];
    const passed = filtered.filter(Boolean).length;
    return filtered.length === 0
      ? maxScore
      : (passed / filtered.length) * maxScore;
  };

  return {
    accuracy: scoreFromChecks(accuracyChecks),
    clarity: scoreFromChecks(clarityChecks),
    completeness: scoreFromChecks(completenessChecks),
    relevance: scoreFromChecks(relevanceChecks)
  };
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
      passRateThresholdOverride: number;
    }) => Promise<{ report: Record<string, unknown>; results: any[] }>;
  };
  const { loadYamlFile } = (await import(loadYamlModuleUrl)) as {
    loadYamlFile: <T>(args: { path: string }) => Promise<T>;
  };
  const config = await loadYamlFile<RubricConfig>({
    path: resolve(
      process.cwd(),
      'libs/ghostagent-evals/src/lib/staged/rubrics.yaml'
    )
  });
  const maxScore = config.scale?.max_score ?? 5;
  const testCases: EvalCase[] = (config.test_cases ?? []).map((testCase) => ({
    category: testCase.category === 'security' ? 'adversarial' : 'happy',
    expectedTools: testCase.expected_tools ?? [],
    id: testCase.id,
    query: testCase.query
  }));

  const tempDirectory = await mkdtemp(resolve(tmpdir(), 'ghostagent-rubric-'));
  const tempDatasetPath = resolve(tempDirectory, 'dataset.json');
  await writeFile(tempDatasetPath, JSON.stringify(testCases, null, 2), 'utf8');

  try {
    const evalResult = await runEvalDataset({
      datasetPathOverride: tempDatasetPath,
      passRateThresholdOverride: 0
    });
    const caseCategoryMap = new Map(
      (config.test_cases ?? []).map((testCase) => [
        testCase.id,
        testCase.category ?? 'default'
      ])
    );
    const perCase = evalResult.results.map((result) => {
      const category = caseCategoryMap.get(result.caseId) ?? 'default';
      const dimensionScores = toDimensionScores({
        checks: result.checks,
        maxScore
      });
      const dimensionWeights = config.category_weights?.[category] ?? {};
      const fallbackWeights = config.dimensions ?? {};
      const aggregate = Object.entries(dimensionScores).reduce(
        (total, [dimension, score]) => {
          const weight =
            dimensionWeights[dimension] ??
            fallbackWeights[dimension]?.weight ??
            0;
          return total + score * weight;
        },
        0
      );

      return {
        aggregate,
        caseId: result.caseId,
        category,
        checks: result.checks,
        dimensions: dimensionScores
      };
    });
    const aggregateAverage =
      perCase.reduce((total, item) => total + item.aggregate, 0) /
      Math.max(perCase.length, 1);
    const rubricReport = {
      aggregateAverage,
      passRate: evalResult.report.passRate,
      perCase,
      thresholds: config.thresholds ?? {}
    };

    const historyDirectoryPath = resolve(process.cwd(), 'eval-history');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await mkdir(historyDirectoryPath, { recursive: true });
    await writeFile(
      resolve(historyDirectoryPath, 'rubric-latest.json'),
      JSON.stringify(rubricReport, null, 2),
      'utf8'
    );
    await writeFile(
      resolve(historyDirectoryPath, `rubric-${timestamp}.json`),
      JSON.stringify(rubricReport, null, 2),
      'utf8'
    );
    console.log(JSON.stringify(rubricReport, null, 2));
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown rubric eval runner error';
  console.error(message);
  process.exit(1);
});
