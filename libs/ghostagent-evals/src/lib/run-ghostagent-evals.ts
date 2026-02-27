import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function shouldEnforceThreshold() {
  return process.env.AGENTFORGE_EVAL_ENFORCE_THRESHOLD === 'true';
}

async function run() {
  const evalDatasetModuleUrl = pathToFileURL(
    resolve(process.cwd(), 'libs/ghostagent-evals/src/lib/run-eval-dataset.ts')
  ).href;
  const { runEvalDataset } = (await import(evalDatasetModuleUrl)) as {
    runEvalDataset: () => Promise<{
      report: Record<string, unknown>;
      results: unknown[];
    }>;
  };
  const result = await runEvalDataset();
  const historyDirectoryPath = resolve(process.cwd(), 'eval-history');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(historyDirectoryPath, { recursive: true });
  await writeFile(
    resolve(historyDirectoryPath, `langsmith-${timestamp}.json`),
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
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown eval runner error';
  console.error(message);
  process.exit(1);
});
