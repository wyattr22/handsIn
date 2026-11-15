const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const args of [[require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.calendar-tests.json'], ['--test', 'tests/coverage.test.mjs', 'tests/coverage-calendar.test.cjs', 'tests/home-summary.test.cjs']]) {
  const result = spawnSync(process.execPath, args, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

