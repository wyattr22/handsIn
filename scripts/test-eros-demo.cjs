const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const args of [
  [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.calendar-tests.json'],
  [require.resolve('typescript/bin/tsc'), 'src/features/demo/eros/timeline.ts', '--target', 'es2022', '--module', 'commonjs', '--outDir', '.eros-test-build', '--skipLibCheck'],
  ['--test', 'tests/eros-demo.test.cjs'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
