import { spawn } from 'node:child_process';

async function run() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import('@ghost_agent/evals/runners/run-ghostagent-evals')"
      ],
      {
        stdio: 'inherit'
      }
    );

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Eval runner exited with code ${code ?? 'unknown'}`));
    });
  });
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown eval runner error';
  console.error(message);
  process.exit(1);
});
