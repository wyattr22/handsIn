import test from 'node:test';
import assert from 'node:assert/strict';
import domain from '../.calendar-test-build/features/coverage/domain.js';
const { createDemoStore, applyCoverage, viewCoverage, coverageLabel } = domain;

const before = '2026-11-15T18:00:00Z';
const during = '2026-11-15T22:05:00Z';
let sequence = 0;
function command(s, cmd, actor = 'sarah', now = before, options = {}) {
  return applyCoverage(s, { coverageId: 'alex', expectedVersion: s.coverages[0].version, operationId: `op-${++sequence}`, command: cmd, ...options }, actor, now);
}
function invited() { return command(createDemoStore(), { type: 'invite', taskIds: ['alex-bag', 'alex-visit'], reviewed: true, originalAvailable: false }); }
function accepted() { return command(invited(), { type: 'respond', response: 'accepted' }, 'ben'); }
function reviewed() { return command(accepted(), { type: 'acknowledge', taskId: 'alex-bag', instructionVersion: 1 }, 'ben'); }
const result = { type: 'outcome', taskId: 'alex-bag', taskVersion: 1, instructionVersion: 1, outcome: 'completed', note: '' };

test('pending preview excludes address, source instructions, activity and unrelated tasks', () => {
  const s = invited(); const view = viewCoverage(s, 'alex', 'ben', before);
  assert.equal(view.kind, 'preview'); assert.equal('address' in view, false); assert.equal('tasks' in view, false);
  assert.equal(coverageLabel(s.coverages[0], before), 'Waiting for a reply'); assert.equal(s.coverages[0].originalAvailable, false);
});
test('intended identity and recipient isolation deny forwarded and cross-recipient access', () => {
  const s = accepted(); assert.equal(viewCoverage(s, 'alex', 'unrelated', before).kind, 'unavailable');
  assert.equal(viewCoverage(s, 'june', 'ben', before).kind, 'unavailable');
  assert.throws(() => command(s, { type: 'arrive' }, 'unrelated', during), /not available/);
});
test('acceptance is separate from arrival and outcomes', () => {
  const s = accepted(); const c = s.coverages[0];
  assert.equal(c.state, 'confirmed'); assert.equal(c.arrivedAt, undefined); assert(c.tasks.every(t => !t.outcome));
});
test('no acceptance after deadline, cancellation or prior acceptance', () => {
  assert.throws(() => command(invited(), { type: 'respond', response: 'accepted' }, 'ben', '2026-11-15T21:00:00Z'), /no longer/);
  const canceled = command(invited(), { type: 'cancel' });
  assert.throws(() => command(canceled, { type: 'respond', response: 'accepted' }, 'ben'), /no longer/);
  assert.throws(() => command(accepted(), { type: 'respond', response: 'accepted' }, 'ben'), /no longer/);
});
test('stale concurrent command fails without changing prior state', () => {
  const s = invited(); const version = s.coverages[0].version;
  const winner = command(s, { type: 'respond', response: 'accepted' }, 'ben');
  assert.throws(() => command(winner, { type: 'cancel' }, 'sarah', before, { expectedVersion: version }), /changed/);
  assert.equal(winner.coverages[0].state, 'confirmed'); assert.equal(s.coverages[0].state, 'seeking');
});
test('exact expiry denies handoff and new mutation, with no device-time grace', () => {
  const s = reviewed(); const end = s.coverages[0].end;
  assert.equal(viewCoverage(s, 'alex', 'ben', end).kind, 'unavailable');
  assert.throws(() => command(s, result, 'ben', end), /ended/);
});
test('preparation access cannot record outcomes before execution window', () => {
  const s = reviewed(); assert.equal(viewCoverage(s, 'alex', 'ben', before).kind, 'handoff');
  assert.throws(() => command(s, result, 'ben'), /visit starts/);
});
test('acceptance does not assert instruction review; stale instructions block outcomes', () => {
  assert.throws(() => command(accepted(), result, 'ben', during), /instructions/);
  const changed = command(reviewed(), { type: 'changeInstruction', taskId: 'alex-bag', text: 'Updated source location.' });
  assert.throws(() => command(changed, { ...result, taskVersion: 2 }, 'ben', during), /instructions/);
  const ack = command(changed, { type: 'acknowledge', taskId: 'alex-bag', instructionVersion: 2 }, 'ben', during);
  assert.equal(command(ack, { ...result, taskVersion: 2, instructionVersion: 2 }, 'ben', during).coverages[0].tasks[0].outcome, 'completed');
});
test('retry returns one effective outcome and altered payload with same key fails', () => {
  const s = reviewed(); const envelope = { coverageId: 'alex', expectedVersion: s.coverages[0].version, operationId: 'stable-key', command: result };
  const saved = applyCoverage(s, envelope, 'ben', during);
  const retry = applyCoverage(saved, envelope, 'ben', during);
  assert.deepEqual(retry, saved);
  assert.throws(() => applyCoverage(saved, { ...envelope, command: { ...result, note: 'changed' } }, 'ben', during), /differs/);
  assert.throws(() => command(saved, result, 'ben', during), /outcome already exists/);
});
test('submitting a report preserves unknown and declined outcomes and closes access', () => {
  let s = reviewed(); s = command(s, { ...result, outcome: 'declined_by_recipient' }, 'ben', during);
  s = command(s, { type: 'report', note: 'Alex wanted quiet time.' }, 'ben', during);
  assert.equal(s.coverages[0].tasks[0].outcome, 'declined_by_recipient');
  assert.equal(s.coverages[0].tasks[1].outcome, undefined);
  assert.equal(viewCoverage(s, 'alex', 'ben', during).kind, 'receipt');
  assert.throws(() => command(s, { type: 'arrive' }, 'ben', during), /ended/);
});
test('withdrawal reopens coverage and revokes handoff without deleting outcomes', () => {
  const s = command(command(reviewed(), result, 'ben', during), { type: 'withdraw' }, 'ben', during);
  assert.equal(s.coverages[0].state, 'seeking'); assert.equal(s.coverages[0].originalAvailable, false);
  assert.equal(s.coverages[0].tasks[0].outcome, 'completed'); assert.equal(viewCoverage(s, 'alex', 'ben', during).kind, 'unavailable');
});
test('subset does not disclose omitted instructions to the helper', () => {
  let s = command(createDemoStore(), { type: 'invite', taskIds: ['alex-bag'], reviewed: true, originalAvailable: true });
  s = command(s, { type: 'respond', response: 'accepted' }, 'ben');
  const view = viewCoverage(s, 'alex', 'ben', before);
  assert.equal(view.kind, 'handoff'); assert.deepEqual(view.coverage.tasks.map(t => t.id), ['alex-bag']); assert.deepEqual(view.coverage.history, []);
});
test('malformed scopes, missing review, uncertain without a note, and medication tasks fail', () => {
  assert.throws(() => command(createDemoStore(), { type: 'invite', taskIds: ['june-bag'], reviewed: true, originalAvailable: false }), /everyday/);
  assert.throws(() => command(createDemoStore(), { type: 'invite', taskIds: ['alex-bag'], reviewed: false, originalAvailable: false }), /Review/);
  assert.throws(() => command(reviewed(), { ...result, outcome: 'uncertain' }, 'ben', during), /short note/);
  const s = reviewed(); s.coverages[0].tasks[0].category = 'medication';
  assert.throws(() => command(s, result, 'ben', during), /medication module/);
});
test('follow-up acknowledgment never changes care outcomes', () => {
  const s = command(accepted(), { type: 'report', note: '' }, 'ben', during);
  const next = command(s, { type: 'followup', note: 'Sarah will clarify what happened.' }, 'sarah', during);
  assert(next.coverages[0].tasks.every(t => !t.outcome)); assert.equal(next.coverages[0].followup, 'Sarah will clarify what happened.');
});
