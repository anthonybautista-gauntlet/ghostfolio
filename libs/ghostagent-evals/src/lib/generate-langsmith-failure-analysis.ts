import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface EvalReport {
  report: {
    passRate: number;
    passRateThreshold: number;
    passed: number;
    summaryByCategory?: Record<string, { passed: number; total: number }>;
    total: number;
  };
  results: {
    caseId: string;
    failedChecks: string[];
    pass: boolean;
    totalMs: number;
  }[];
}

function formatCategoryBreakdown(
  summaryByCategory: Record<string, { passed: number; total: number }> = {}
) {
  const entries = Object.entries(summaryByCategory);
  if (entries.length === 0) {
    return ['- Category breakdown unavailable in current report'];
  }

  return entries.map(([category, value]) => {
    return `  - ${category}: \`${value.passed}/${value.total}\``;
  });
}

async function run() {
  const reportPath = resolve(process.cwd(), 'eval-langsmith-report.json');
  const outputPath = resolve(
    process.cwd(),
    'context_docs/AgentForge_Eval_Failure_Analysis.md'
  );
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as EvalReport;
  const passRatePercent = (report.report.passRate * 100).toFixed(0);
  const failures = report.results.filter((result) => !result.pass);
  const failureLines =
    failures.length === 0
      ? ['- None']
      : failures.map((failure) => {
          const checks = failure.failedChecks.join(', ');
          return `- \`${failure.caseId}\`: \`${checks}\` failed (\`${failure.totalMs}ms\`)`;
        });
  const failureCountByCheck = failures.reduce<Record<string, number>>(
    (accumulator, failure) => {
      for (const check of failure.failedChecks) {
        accumulator[check] = (accumulator[check] ?? 0) + 1;
      }
      return accumulator;
    },
    {}
  );
  const topFailureChecks = Object.entries(failureCountByCheck)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([checkName, count]) => `- \`${checkName}\`: ${count}`);

  const content = `# AgentForge Eval Failure Analysis (Latest Run)

Source report: \`/eval-langsmith-report.json\`

## Current Snapshot

- Pass rate: \`${report.report.passRate.toFixed(2)}\` (\`${report.report.passed}/${report.report.total}\`)
- Threshold: \`${report.report.passRateThreshold.toFixed(2)}\`
- Pass-rate percent: \`${passRatePercent}%\`
- Category breakdown:
${formatCategoryBreakdown(report.report.summaryByCategory).join('\n')}

## Failing Cases (Latest Report)

${failureLines.join('\n')}

## Failure Pattern Analysis

- Total failing cases: \`${failures.length}\`
- Most frequent failing checks:
${topFailureChecks.length > 0 ? topFailureChecks.join('\n') : '- None'}

## Notes

- This file is auto-generated from the latest langsmith eval report.
- Re-run \`npm run eval:langsmith\` to refresh this analysis.
`;

  await writeFile(outputPath, content, 'utf8');
  console.log(
    JSON.stringify(
      {
        sourceReport: reportPath,
        updated: outputPath
      },
      null,
      2
    )
  );
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown langsmith analysis generation error';
  console.error(message);
  process.exit(1);
});
