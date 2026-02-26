import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function run() {
  const evalRunnerModuleUrl = pathToFileURL(
    resolve(
      process.cwd(),
      'libs/ghostagent-evals/src/lib/run-ghostagent-evals.ts'
    )
  ).href;
  const evalRunner = (await import(evalRunnerModuleUrl)) as {
    default?: () => Promise<void>;
  };

  if (typeof evalRunner.default === 'function') {
    await evalRunner.default();
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown eval runner error';
  console.error(message);
  process.exit(1);
});
