const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const args of [
  [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.calendar-tests.json'],
  ['--test', 'tests/coordination.test.cjs'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
