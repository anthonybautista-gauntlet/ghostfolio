import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EvalApiResponse, EvalCase } from './run-eval-dataset';

interface VariantConfig {
  defaults?: Record<string, unknown>;
  variants: Record<
    string,
    {
      description?: string;
      model?: string;
      system_prompt?: string;
      temperature?: number;
    }
  >;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
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
    }) => { checks: Record<string, boolean>; pass: boolean };
  };

  const evalApiUrl = process.env.AGENTFORGE_EVAL_API_URL;
  const evalApiToken = process.env.AGENTFORGE_EVAL_API_TOKEN;
  const latencyThresholdMs = Number(
    process.env.AGENTFORGE_EVAL_MAX_LATENCY_MS ?? '15000'
  );
  const datasetPath = resolve(
    process.cwd(),
    process.env.AGENTFORGE_VARIANTS_DATASET_PATH ??
      'libs/ghostagent-evals/src/lib/staged/golden-cases.json'
  );

  if (!evalApiUrl || !evalApiToken) {
    throw new Error(
      'Missing AGENTFORGE_EVAL_API_URL or AGENTFORGE_EVAL_API_TOKEN environment variables.'
    );
  }

  const loadYamlModuleUrl = pathToFileURL(
    resolve(process.cwd(), 'libs/ghostagent-evals/src/lib/staged/load-yaml.ts')
  ).href;
  const { loadYamlFile } = (await import(loadYamlModuleUrl)) as {
    loadYamlFile: <T>(args: { path: string }) => Promise<T>;
  };
  const variants = await loadYamlFile<VariantConfig>({
    path: resolve(
      process.cwd(),
      'libs/ghostagent-evals/src/lib/staged/variants.yaml'
    )
  });
  const dataset = JSON.parse(await readFile(datasetPath, 'utf8')) as EvalCase[];
  const reportByVariant: Record<string, unknown> = {};

  for (const [variantKey, variant] of Object.entries(variants.variants ?? {})) {
    const latencies: number[] = [];
    const toolUsage: Record<string, number> = {};
    let passed = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const testCase of dataset) {
      const startedAt = Date.now();
      const apiResponse = await fetch(
        `${evalApiUrl.replace(/\/$/, '')}/api/v1/ai/chat`,
        {
          body: JSON.stringify({
            message: testCase.query,
            selectedModel: variant.model ?? variants.defaults?.model
          }),
          headers: {
            Authorization: `Bearer ${evalApiToken}`,
            'Content-Type': 'application/json'
          },
          method: 'POST'
        }
      );

      if (!apiResponse.ok) {
        continue;
      }

      const response = (await apiResponse.json()) as EvalApiResponse & {
        usage?: {
          estimatedCostUsd?: number;
          inputTokens?: number;
          outputTokens?: number;
        };
      };
      const totalMs = response.timings?.totalMs ?? Date.now() - startedAt;
      latencies.push(totalMs);
      for (const invocation of response.toolInvocations ?? []) {
        if (invocation.ok) {
          toolUsage[invocation.tool] = (toolUsage[invocation.tool] ?? 0) + 1;
        }
      }
      totalInputTokens += response.usage?.inputTokens ?? 0;
      totalOutputTokens += response.usage?.outputTokens ?? 0;
      totalCost += response.usage?.estimatedCostUsd ?? 0;

      const score = scoreCase({
        latencyThresholdMs,
        response,
        testCase
      });
      if (score.pass) {
        passed += 1;
      }
    }

    reportByVariant[variantKey] = {
      description: variant.description,
      model: variant.model ?? variants.defaults?.model,
      notes: {
        systemPromptVariant: variant.system_prompt,
        temperature:
          variant.temperature ??
          (variants.defaults?.temperature as number | undefined)
      },
      passRate: passed / Math.max(dataset.length, 1),
      performance: {
        avgMs:
          latencies.reduce((total, latency) => total + latency, 0) /
          Math.max(latencies.length, 1),
        p50Ms: percentile(latencies, 50),
        p95Ms: percentile(latencies, 95)
      },
      tokenUsage: {
        averageInputTokens: totalInputTokens / Math.max(dataset.length, 1),
        averageOutputTokens: totalOutputTokens / Math.max(dataset.length, 1),
        estimatedCostUsd: Number(totalCost.toFixed(6))
      },
      toolUsage
    };
  }

  const report = {
    datasetPath,
    generatedAt: new Date().toISOString(),
    variants: reportByVariant
  };
  const historyDirectoryPath = resolve(process.cwd(), 'eval-history');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(historyDirectoryPath, { recursive: true });
  await writeFile(
    resolve(historyDirectoryPath, 'variants-latest.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  await writeFile(
    resolve(historyDirectoryPath, `variants-${timestamp}.json`),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown variant eval runner error';
  console.error(message);
  process.exit(1);
});
