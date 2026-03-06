import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const matrixPath = path.join(root, 'scripts', 'qa', 'matrix.json');
const reportDir = path.join(root, 'qa', 'reports');

const matrix = JSON.parse(readFileSync(matrixPath, 'utf-8'));

function runCommand(command) {
  try {
    const output = execSync(command, {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 5 * 1024 * 1024,
    });

    return {
      status: 'passed',
      command,
      stdout: output,
      stderr: '',
    };
  } catch (error) {
    return {
      status: 'failed',
      command,
      stdout: error.stdout ? String(error.stdout) : '',
      stderr: error.stderr ? String(error.stderr) : '',
      message: error.message,
    };
  }
}

const baseline = matrix.baseline.map((entry) => {
  const result = runCommand(entry.command);
  return { ...entry, ...result, startedAt: new Date().toISOString() };
});

const hasFailure = baseline.some((item) => item.required && item.status === 'failed');

const report = {
  runAt: new Date().toISOString(),
  root,
  baseline,
  matrix: matrix.cases.map((entry) => ({
    ...entry,
    status: 'manual-pending',
  })),
  summary: {
    baselinePassed: baseline.filter((item) => item.status === 'passed').length,
    baselineFailed: baseline.filter((item) => item.status === 'failed').length,
    manualCases: matrix.cases.length,
  },
};

mkdirSync(reportDir, { recursive: true });
const fileTs = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(reportDir, `qa-report-${fileTs}.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const lines = [];
lines.push(`# QA Execution Report`);
lines.push(`Generated: ${report.runAt}`);
lines.push('');
lines.push('## Baseline checks');
for (const item of baseline) {
  lines.push(`- [${item.status === 'passed' ? 'x' : ' '}] ${item.id} ${item.name}`);
  lines.push(`  - command: ${item.command}`);
  if (item.status === 'failed') {
    lines.push(`  - result: FAILED`);
    if (item.message) lines.push(`  - error: ${item.message.split('\n')[0]}`);
  }
}
lines.push('');
lines.push('## Manual matrix cases');
for (const item of report.matrix) {
  lines.push(`- [ ] ${item.id} ${item.name}`);
}
lines.push('');
lines.push(`Report JSON: ${reportPath}`);

const mdPath = path.join(reportDir, `qa-report-${fileTs}.md`);
writeFileSync(mdPath, `${lines.join('\n')}\n`);

console.log(lines.join('\n'));

if (hasFailure) {
  process.exitCode = 1;
}
