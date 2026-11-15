import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoStore, applyCoverage, viewCoverage, coverageLabel } from '../src/features/coverage/domain.ts';

const before = '2026-11-15T18:00:00Z';
const during = '2026-11-15T22:05:00Z';
let sequence = 0;
function command(s, cmd, actor = 'maya', now = before, options = {}) {
  return applyCoverage(s, { coverageId: 'nora', expectedVersion: s.coverages[0].version, operationId: `op-${++sequence}`, command: cmd, ...options }, actor, now);
}
function invited() { return command(createDemoStore(), { type: 'invite', taskIds: ['nora-bag', 'nora-visit'], reviewed: true, originalAvailable: false }); }
function accepted() { return command(invited(), { type: 'respond', response: 'accepted' }, 'casey'); }
function reviewed() { return command(accepted(), { type: 'acknowledge', taskId: 'nora-bag', instructionVersion: 1 }, 'casey'); }
const result = { type: 'outcome', taskId: 'nora-bag', taskVersion: 1, instructionVersion: 1, outcome: 'completed', note: '' };

test('pending preview excludes address, source instructions, activity and unrelated tasks', () => {
  const s = invited(); const view = viewCoverage(s, 'nora', 'casey', before);
  assert.equal(view.kind, 'preview'); assert.equal('address' in view, false); assert.equal('tasks' in view, false);
  assert.equal(coverageLabel(s.coverages[0], before), 'Waiting for a reply'); assert.equal(s.coverages[0].originalAvailable, false);
});
test('intended identity and recipient isolation deny forwarded and cross-recipient access', () => {
  const s = accepted(); assert.equal(viewCoverage(s, 'nora', 'unrelated', before).kind, 'unavailable');
  assert.equal(viewCoverage(s, 'eli', 'casey', before).kind, 'unavailable');
  assert.throws(() => command(s, { type: 'arrive' }, 'unrelated', during), /not available/);
});
test('acceptance is separate from arrival and outcomes', () => {
  const s = accepted(); const c = s.coverages[0];
  assert.equal(c.state, 'confirmed'); assert.equal(c.arrivedAt, undefined); assert(c.tasks.every(t => !t.outcome));
});
test('no acceptance after deadline, cancellation or prior acceptance', () => {
  assert.throws(() => command(invited(), { type: 'respond', response: 'accepted' }, 'casey', '2026-11-15T21:00:00Z'), /no longer/);
  const canceled = command(invited(), { type: 'cancel' });
  assert.throws(() => command(canceled, { type: 'respond', response: 'accepted' }, 'casey'), /no longer/);
  assert.throws(() => command(accepted(), { type: 'respond', response: 'accepted' }, 'casey'), /no longer/);
});
test('stale concurrent command fails without changing prior state', () => {
  const s = invited(); const version = s.coverages[0].version;
  const winner = command(s, { type: 'respond', response: 'accepted' }, 'casey');
  assert.throws(() => command(winner, { type: 'cancel' }, 'maya', before, { expectedVersion: version }), /changed/);
  assert.equal(winner.coverages[0].state, 'confirmed'); assert.equal(s.coverages[0].state, 'seeking');
});
test('exact expiry denies handoff and new mutation, with no device-time grace', () => {
  const s = reviewed(); const end = s.coverages[0].end;
  assert.equal(viewCoverage(s, 'nora', 'casey', end).kind, 'unavailable');
  assert.throws(() => command(s, result, 'casey', end), /ended/);
});
test('preparation access cannot record outcomes before execution window', () => {
  const s = reviewed(); assert.equal(viewCoverage(s, 'nora', 'casey', before).kind, 'handoff');
  assert.throws(() => command(s, result, 'casey'), /visit starts/);
});
test('acceptance does not assert instruction review; stale instructions block outcomes', () => {
  assert.throws(() => command(accepted(), result, 'casey', during), /instructions/);
  const changed = command(reviewed(), { type: 'changeInstruction', taskId: 'nora-bag', text: 'Updated source location.' });
  assert.throws(() => command(changed, { ...result, taskVersion: 2 }, 'casey', during), /instructions/);
  const ack = command(changed, { type: 'acknowledge', taskId: 'nora-bag', instructionVersion: 2 }, 'casey', during);
  assert.equal(command(ack, { ...result, taskVersion: 2, instructionVersion: 2 }, 'casey', during).coverages[0].tasks[0].outcome, 'completed');
});
test('retry returns one effective outcome and altered payload with same key fails', () => {
  const s = reviewed(); const envelope = { coverageId: 'nora', expectedVersion: s.coverages[0].version, operationId: 'stable-key', command: result };
  const saved = applyCoverage(s, envelope, 'casey', during);
  const retry = applyCoverage(saved, envelope, 'casey', during);
  assert.deepEqual(retry, saved);
  assert.throws(() => applyCoverage(saved, { ...envelope, command: { ...result, note: 'changed' } }, 'casey', during), /differs/);
  assert.throws(() => command(saved, result, 'casey', during), /outcome already exists/);
});
test('submitting a report preserves unknown and declined outcomes and closes access', () => {
  let s = reviewed(); s = command(s, { ...result, outcome: 'declined_by_recipient' }, 'casey', during);
  s = command(s, { type: 'report', note: 'Nora wanted quiet time.' }, 'casey', during);
  assert.equal(s.coverages[0].tasks[0].outcome, 'declined_by_recipient');
  assert.equal(s.coverages[0].tasks[1].outcome, undefined);
  assert.equal(viewCoverage(s, 'nora', 'casey', during).kind, 'receipt');
  assert.throws(() => command(s, { type: 'arrive' }, 'casey', during), /ended/);
});
test('withdrawal reopens coverage and revokes handoff without deleting outcomes', () => {
  const s = command(command(reviewed(), result, 'casey', during), { type: 'withdraw' }, 'casey', during);
  assert.equal(s.coverages[0].state, 'seeking'); assert.equal(s.coverages[0].originalAvailable, false);
  assert.equal(s.coverages[0].tasks[0].outcome, 'completed'); assert.equal(viewCoverage(s, 'nora', 'casey', during).kind, 'unavailable');
});
test('subset does not disclose omitted instructions to the helper', () => {
  let s = command(createDemoStore(), { type: 'invite', taskIds: ['nora-bag'], reviewed: true, originalAvailable: true });
  s = command(s, { type: 'respond', response: 'accepted' }, 'casey');
  const view = viewCoverage(s, 'nora', 'casey', before);
  assert.equal(view.kind, 'handoff'); assert.deepEqual(view.coverage.tasks.map(t => t.id), ['nora-bag']); assert.deepEqual(view.coverage.history, []);
});
test('malformed scopes, missing review, uncertain without a note, and medication tasks fail', () => {
  assert.throws(() => command(createDemoStore(), { type: 'invite', taskIds: ['eli-bag'], reviewed: true, originalAvailable: false }), /everyday/);
  assert.throws(() => command(createDemoStore(), { type: 'invite', taskIds: ['nora-bag'], reviewed: false, originalAvailable: false }), /Review/);
  assert.throws(() => command(reviewed(), { ...result, outcome: 'uncertain' }, 'casey', during), /short note/);
  const s = reviewed(); s.coverages[0].tasks[0].category = 'medication';
  assert.throws(() => command(s, result, 'casey', during), /medication module/);
});
test('follow-up acknowledgment never changes care outcomes', () => {
  const s = command(accepted(), { type: 'report', note: '' }, 'casey', during);
  const next = command(s, { type: 'followup', note: 'Maya will clarify what happened.' }, 'maya', during);
  assert(next.coverages[0].tasks.every(t => !t.outcome)); assert.equal(next.coverages[0].followup, 'Maya will clarify what happened.');
});
