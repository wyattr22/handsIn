const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Timeline } = require('../.eros-test-build/timeline.js');
const { makeFixtures } = require('../.calendar-test-build/features/coordination/demo/fixtures.js');
const { applyCommand } = require('../.calendar-test-build/server/domain/coordination/service.js');

test('25-second playback waits for results and issues each action once', () => {
  let calls = 0, rendered = false;
  const p = new Timeline([{ at: 0, caption: 'accept', act: () => calls++, ready: () => rendered }]);
  p.resume(100); p.tick(100); p.tick(500);
  assert.equal(calls, 1); assert.equal(p.pending, true);
  rendered = true; assert.equal(p.tick(600), 0);
  p.tick(25099); assert.equal(p.finished, false);
  p.tick(25100); assert.equal(p.finished, true); assert.equal(p.elapsed, 25000);
  p.tick(26000); assert.equal(calls, 1);
});
test('pause excludes paused time and does not issue an action at the pause boundary', () => {
  let calls = 0;
  const p = new Timeline([{ at: 3000, caption: '', act: () => calls++, ready: () => true }]);
  p.resume(0); p.tick(1000); p.pause(3000);
  assert.equal(calls, 0); p.tick(60000); assert.equal(p.elapsed, 3000);
  p.resume(60000); p.tick(60000); assert.equal(calls, 1);
  p.tick(60010); p.pause(60020); p.resume(90000); p.tick(90010);
  assert.equal(calls, 1); assert.equal(p.elapsed, 3030);
});
test('missing readiness, thrown actions and overlong interruption recover without replay', () => {
  let calls = 0;
  const p = new Timeline([{ at: 0, caption: '', act: () => calls++, ready: () => false }]);
  p.resume(0); p.tick(0); p.tick(2001); p.resume(3000); p.tick(4000);
  assert.match(p.error, /expected screen/); assert.equal(calls, 1);
  const failed = new Timeline([{ at: 0, caption: '', act: () => { throw new Error('Denied'); }, ready: () => true }]);
  failed.resume(0); failed.tick(0); assert.equal(failed.error, 'Denied');
  const stalled = new Timeline([]); stalled.resume(0); stalled.tick(31000); assert.match(stalled.error, /too long/);
});
test('stop prevents pending mutations and a new run has independent state', () => {
  let calls = 0;
  const steps = [{ at: 3000, caption: '', act: () => calls++, ready: () => true }];
  const old = new Timeline(steps); old.resume(0); old.tick(1000); old.stop(); old.tick(4000);
  assert.equal(calls, 0);
  const fresh = new Timeline(steps); fresh.resume(5000); fresh.tick(8000); assert.equal(calls, 1); assert.equal(fresh.elapsed, 3000);
});
test('June story uses real acceptance and outcome domain rules, with attributed history', () => {
  const now = '2026-11-15T23:45:00Z';
  let state = makeFixtures(now), serial = 0;
  const execute = command => { state = applyCommand(state, command, { actorId: 'ben', now, idempotencyKey: `eros-${++serial}`, newId: () => `id-${++serial}` }).state; };
  assert.throws(() => execute({ type: 'outcome', taskId: 't-walk', expectedVersion: 1, status: 'completed', detail: 'Test' }), /Accept primary/);
  execute({ type: 'respondAssignment', id: 'a-walk', expectedVersion: 1, response: 'accepted' });
  const task = state.tasks.find(t => t.id === 't-walk');
  execute({ type: 'outcome', taskId: task.id, expectedVersion: task.version, status: 'completed', detail: 'June chose a walk in the garden.' });
  assert.equal(state.tasks.find(t => t.id === 't-walk').status, 'completed');
  assert.equal(state.audit.filter(a => a.action === 'outcome').length, 1);
  assert.equal(state.audit.at(-1).actorId, 'ben');
  assert.equal(state.tasks.find(t => t.id === 't-ride').status, 'open');
  const reset = makeFixtures(now);
  assert.equal(reset.assignments[0].status, 'requested'); assert.equal(reset.audit.length, 0);
});
