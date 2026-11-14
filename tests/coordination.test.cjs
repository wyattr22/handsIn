const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyCommand, projectView, coverage, authorize, assignmentConflicts, shouldDispatch } = require('../.calendar-test-build/server/domain/coordination/service.js');
const { localToInstant, addLocalDays, parts } = require('../.calendar-test-build/server/domain/coordination/time.js');
const { makeFixtures } = require('../.calendar-test-build/features/coordination/demo/fixtures.js');
const now = '2026-11-14T15:00:00Z';
let counter = 0;
const context = (actorId = 'sarah', key = `op-${++counter}`, clock = now) => ({ actorId, now: clock, idempotencyKey: key, newId: () => `id-${++counter}` });
const request = (s, taskId = 't-ride', helperId = 'ben') => applyCommand(s, { type: 'requestAssignment', taskId, helperId, expectedVersion: s.tasks.find(t => t.id === taskId).version }, context());
const respond = (s, id, response = 'accepted', actorId = 'ben') => applyCommand(s, { type: 'respondAssignment', id, response, expectedVersion: s.assignments.find(a => a.id === id).version }, context(actorId));
const outcome = (s, taskId, status = 'completed') => applyCommand(s, { type: 'outcome', taskId, expectedVersion: s.tasks.find(t => t.id === taskId).version, status, detail: 'Fictional test outcome' }, context('ben'));
const errorCode = code => error => error.code === code;
function input(overrides = {}) { return { recipientId: 'r-alex', title: 'Test task', category: 'transport', start: '2026-11-15T17:00:00Z', end: '2026-11-15T18:00:00Z', timezone: 'America/Los_Angeles', ...overrides }; }

test('two authorized recipients and unrelated account isolation', () => {
  const s = makeFixtures(now);
  assert.equal(projectView(s, 'sarah', now).recipients.length, 2);
  assert.deepEqual(projectView(s, 'unrelated', now).tasks, []);
  assert.deepEqual(projectView(s, 'unrelated', now).instructions, []);
  assert.throws(() => request(s, 't-ride', 'unrelated'), errorCode('FORBIDDEN'));
  assert.throws(() => applyCommand(s, { type: 'cancelTask', taskId: 't-ride', expectedVersion: 1, scope: 'one' }, context('unrelated')), errorCode('FORBIDDEN'));
});
test('pending is not accepted; only intended helper can respond', () => {
  const requested = request(makeFixtures(now));
  assert.equal(coverage(requested.state, requested.state.tasks[0]), 'pending');
  assert.throws(() => respond(requested.state, requested.resultId, 'accepted', 'sarah'), errorCode('FORBIDDEN'));
  const accepted = respond(requested.state, requested.resultId);
  assert.equal(coverage(accepted.state, accepted.state.tasks[0]), 'accepted');
  assert.equal(outcome(accepted.state, 't-ride').state.tasks[0].status, 'completed');
});
test('decline and cancellation leave gaps; replacement preserves accepted responsibility until acceptance', () => {
  let r = request(makeFixtures(now));
  let s = respond(r.state, r.resultId, 'declined').state;
  assert.equal(coverage(s, s.tasks[0]), 'uncovered');
  r = request(s); s = respond(r.state, r.resultId).state;
  r = request(s, 't-ride', 'sarah');
  assert.equal(r.state.assignments.find(a => a.id === s.assignments.find(a => a.status === 'accepted').id).status, 'accepted');
  s = respond(r.state, r.resultId, 'accepted', 'sarah').state;
  assert.equal(s.assignments.filter(a => a.taskId === 't-ride' && a.status === 'accepted').length, 1);
  const a = s.assignments.find(a => a.taskId === 't-ride' && a.status === 'accepted');
  s = applyCommand(s, { type: 'cancelAssignment', id: a.id, expectedVersion: a.version }, context()).state;
  assert.equal(coverage(s, s.tasks[0]), 'uncovered');
});
test('unable outcome remains unresolved and releases accepted assignment', () => {
  const r = request(makeFixtures(now));
  const accepted = respond(r.state, r.resultId);
  const s = outcome(accepted.state, 't-ride', 'unable_to_complete').state;
  assert.equal(s.tasks[0].status, 'unable_to_complete');
  assert.equal(coverage(s, s.tasks[0]), 'uncovered');
});
test('atomic retries, stale versions, and no duplicated outcomes', () => {
  const s = makeFixtures(now);
  const c = { type: 'createTask', input: input() }; const ctx = context('sarah', 'same-operation');
  const first = applyCommand(s, c, ctx); const retry = applyCommand(first.state, c, ctx);
  assert.equal(retry.state.tasks.length, first.state.tasks.length);
  assert.equal(retry.resultId, first.resultId);
  assert.throws(() => applyCommand(first.state, { ...c, input: input({ title: 'Changed payload' }) }, ctx), errorCode('VALIDATION_FAILED'));
  const r = request(s); const accepted = respond(r.state, r.resultId);
  assert.throws(() => applyCommand(accepted.state, { type: 'outcome', taskId: 't-ride', expectedVersion: 1, status: 'completed', detail: 'test' }, context('ben')), errorCode('VERSION_CONFLICT'));
  const completed = outcome(accepted.state, 't-ride');
  assert.throws(() => outcome(completed.state, 't-ride'), errorCode('ALREADY_RECORDED'));
  assert.equal(s.tasks[0].version, 1, 'original was not mutated');
});
test('revoked and expired grants deny reads/writes even after prior success', () => {
  const s = makeFixtures(now);
  s.grants.push({ actorId: 'guest', recipientId: 'r-june', circleId: 'demo-circle', permissions: ['read', 'perform'], taskIds: ['t-walk'], expiresAt: '2026-11-14T16:00:00Z' });
  assert.equal(projectView(s, 'guest', now).tasks.length, 1);
  assert.equal(projectView(s, 'guest', '2026-11-14T16:00:00Z').tasks.length, 0);
  assert.throws(() => authorize(s, 'guest', 'r-alex', 'read', now, 't-ride'), errorCode('FORBIDDEN'));
  s.grants.at(-1).revokedAt = now;
  assert.equal(projectView(s, 'guest', now).tasks.length, 0);
});
test('circle mismatch cannot grant access and temporary helpers cannot manage ungranted tasks', () => {
  const s = makeFixtures(now);
  s.grants.push({ actorId: 'guest', recipientId: 'r-alex', circleId: 'wrong', permissions: ['read', 'manage', 'perform'] });
  assert.equal(projectView(s, 'guest', now).tasks.length, 0);
  s.grants.at(-1).circleId = 'demo-circle'; s.grants.at(-1).taskIds = ['t-ride'];
  assert.throws(() => applyCommand(s, { type: 'createTask', input: input() }, context('guest')), errorCode('FORBIDDEN'));
});
test('conflicts block acceptance and hide unauthorized commitment details', () => {
  let s = makeFixtures(now); const r = request(s); s = respond(r.state, r.resultId).state;
  const another = { ...s.tasks[1], start: s.tasks[0].start, end: s.tasks[0].end };
  s.tasks[1] = another;
  s.grants = s.grants.filter(g => !(g.actorId === 'sarah' && g.recipientId === 'r-alex'));
  const conflicts = assignmentConflicts(s, 'sarah', another, 'ben', now);
  assert.equal(conflicts[0].message, 'Unavailable: another accepted commitment overlaps.');
  assert.throws(() => respond(s, 'a-walk'), errorCode('VALIDATION_FAILED'));
});
test('recorded unavailability blocks acceptance; capability unknown is an explicit warning', () => {
  const s = makeFixtures(now); s.helpers.find(h => h.id === 'ben').unavailable = [{ start: s.tasks[0].start, end: s.tasks[0].end }];
  const r = request(s);
  assert.throws(() => respond(r.state, r.resultId), errorCode('VALIDATION_FAILED'));
  s.tasks[0].category = 'daily_care';
  assert.ok(assignmentConflicts(s, 'sarah', s.tasks[0], 'ben', now).some(c => c.kind === 'capability_unknown'));
});
test('stale instructions prevent completion; medications never use generic outcomes', () => {
  const s = makeFixtures(now); const accepted = respond(s, 'a-walk').state;
  accepted.instructions[0].version = 2;
  assert.throws(() => outcome(accepted, 't-walk'), errorCode('VERSION_CONFLICT'));
  const r = request(makeFixtures(now)); const a = respond(r.state, r.resultId).state;
  a.tasks[0].medicationOccurrenceId = 'dose-1';
  assert.throws(() => outcome(a, 't-ride'), errorCode('VALIDATION_FAILED'));
});
test('invalid input and cross-recipient links fail without partial creation', () => {
  const s = makeFixtures(now);
  for (const i of [input({ title: '' }), input({ end: '2026-11-15T16:00:00Z' }), input({ timezone: 'unknown' }), input({ instructionId: 'i-walk' }), input({ recurrence: { frequency: 'daily', count: 10000 } })]) {
    assert.throws(() => applyCommand(s, { type: 'createTask', input: i }, context()), errorCode('VALIDATION_FAILED'));
  }
  assert.equal(s.tasks.length, 2);
  assert.throws(() => applyCommand(s, { type: 'unknown' }, context()), errorCode('VALIDATION_FAILED'));
});
test('daily/weekly recurrence follows local wall time and bounds occurrences', () => {
  const s = makeFixtures(now);
  const r = applyCommand(s, { type: 'createTask', input: input({ start: '2026-10-31T16:00:00Z', end: '2026-10-31T17:00:00Z', recurrence: { frequency: 'daily', count: 3 } }) }, context());
  const series = r.state.tasks.filter(t => t.seriesId);
  assert.equal(series.length, 3);
  assert.equal(series[1].start, '2026-11-01T17:00:00.000Z');
  assert.ok(series.every(t => parts(t.start, t.timezone).endsWith('09:00')));
  const weekly = applyCommand(s, { type: 'createTask', input: input({ recurrence: { frequency: 'weekly', count: 2 } }) }, context()).state.tasks.filter(t => t.seriesId);
  assert.equal(Date.parse(weekly[1].start) - Date.parse(weekly[0].start), 7 * 86400000);
});
test('DST ambiguous and nonexistent times require explicit resolution, without partial series', () => {
  assert.throws(() => localToInstant('2026-11-01T01:30', 'America/Los_Angeles'), errorCode('VALIDATION_FAILED'));
  assert.throws(() => localToInstant('2026-03-08T02:30', 'America/Los_Angeles'), errorCode('VALIDATION_FAILED'));
  assert.equal(addLocalDays('2026-03-07T17:00:00Z', 1, 'America/Los_Angeles'), '2026-03-08T16:00:00.000Z');
});
test('series cancellations preserve completed history and invalidate future reminders', () => {
  let s = applyCommand(makeFixtures(now), { type: 'createTask', input: input({ recurrence: { frequency: 'daily', count: 3 } }) }, context()).state;
  const series = s.tasks.filter(t => t.seriesId); series[0].status = 'completed';
  s = applyCommand(s, { type: 'cancelTask', taskId: series[1].id, expectedVersion: 1, scope: 'future' }, context()).state;
  assert.equal(s.tasks.find(t => t.id === series[0].id).status, 'completed');
  assert.ok(s.tasks.filter(t => t.seriesId && t.id !== series[0].id).every(t => t.status === 'canceled'));
  assert.ok(s.outbox.filter(e => e.kind === 'coverage_gap' && e.taskId === series[1].id).every(e => e.status === 'invalidated'));
});
test('rescheduling a task withdraws stale accepted coverage and queues fresh events', () => {
  const r = request(makeFixtures(now)); let s = respond(r.state, r.resultId).state;
  const task = s.tasks[0];
  s = applyCommand(s, { type: 'editTask', taskId: task.id, expectedVersion: task.version, scope: 'one', title: task.title, start: '2026-11-15T17:00:00Z', end: '2026-11-15T18:00:00Z' }, context()).state;
  assert.equal(coverage(s, s.tasks[0]), 'uncovered');
  assert.ok(s.outbox.filter(e => e.kind === 'task_due').every(e => e.status === 'invalidated'));
});
test('completion, cancellation, revocation and reassignment suppress stale due events', () => {
  const r = request(makeFixtures(now)); let s = respond(r.state, r.resultId).state;
  const event = s.outbox.find(e => e.kind === 'task_due' && e.status === 'pending');
  assert.ok(shouldDispatch(s, event.id, '2026-11-14T20:00:00Z'));
  assert.equal(shouldDispatch(outcome(s, 't-ride').state, event.id, '2026-11-14T20:00:00Z'), false);
  s.grants.find(g => g.actorId === 'ben' && g.recipientId === 'r-alex').revokedAt = now;
  assert.equal(shouldDispatch(s, event.id, '2026-11-14T20:00:00Z'), false);
});
test('visit cancellation cancels unresolved linked work but preserves historical outcomes', () => {
  const s = makeFixtures(now); const t = structuredClone(s.tasks[0]); t.id = 'historical'; t.status = 'completed'; s.tasks.push(t);
  const result = applyCommand(s, { type: 'cancelVisit', id: 'v-visit', expectedVersion: 1 }, context()).state;
  assert.equal(result.visits[0].canceled, true);
  assert.equal(result.tasks[0].status, 'canceled');
  assert.equal(result.tasks.find(t => t.id === 'historical').status, 'completed');
});

test('future series reschedule preserves calendar spacing and history', () => {
  let s = applyCommand(makeFixtures(now), { type: 'createTask', input: input({ recurrence: { frequency: 'weekly', count: 3 } }) }, context()).state;
  const series = s.tasks.filter(t => t.seriesId); series[0].status = 'completed';
  s = applyCommand(s, { type: 'editTask', taskId: series[1].id, expectedVersion: 1, scope: 'future', title: 'New time', start: '2026-11-23T18:00:00Z', end: '2026-11-23T19:00:00Z' }, context()).state;
  assert.equal(s.tasks.find(t => t.id === series[0].id).start, series[0].start);
  assert.equal(s.tasks.find(t => t.id === series[2].id).start, '2026-11-30T18:00:00.000Z');
  assert.ok(s.audit.some(e => e.taskId === series[2].id && e.action === 'editTask'));
});
test('current instructions require explicit coordinator review before updating linked work', () => {
  const s = makeFixtures(now); const t = s.tasks[1]; s.instructions[0].version = 2;
  const cmd = { type: 'editTask', taskId: t.id, expectedVersion: 1, scope: 'one', title: t.title, start: t.start, end: t.end };
  assert.throws(() => applyCommand(s, cmd, context()), errorCode('VERSION_CONFLICT'));
  const reviewed = applyCommand(s, { ...cmd, instructionVersion: 2 }, context()).state;
  assert.equal(reviewed.tasks[1].instructionVersion, 2);
});
test('task circle mismatch is rejected for direct mutations and projections', () => {
  const s = makeFixtures(now); s.tasks[0].circleId = 'other-circle';
  assert.throws(() => request(s), errorCode('FORBIDDEN'));
  assert.equal(projectView(s, 'sarah', now).tasks.some(t => t.id === 't-ride'), false);
});

test('gap and response notifications route to coordinators; replaced helper receives a change event', () => {
  let r = request(makeFixtures(now)); let s = respond(r.state, r.resultId).state;
  assert.ok(s.outbox.some(e => e.kind === 'assignment_responded' && e.targetId === 'sarah' && e.status === 'pending'));
  const unable = outcome(s, 't-ride', 'unable_to_complete').state;
  assert.ok(unable.outbox.some(e => e.kind === 'coverage_gap' && e.targetId === 'sarah' && e.status === 'pending'));
  r = request(s, 't-ride', 'sarah'); s = respond(r.state, r.resultId, 'accepted', 'sarah').state;
  assert.ok(s.outbox.some(e => e.kind === 'task_changed' && e.targetId === 'ben' && e.status === 'pending'));
});
test('idempotent retry cannot bypass a revoked permission', () => {
  const ctx = context('sarah', 'retry-after-revocation'); const command = { type: 'createTask', input: input() };
  const s = applyCommand(makeFixtures(now), command, ctx).state;
  s.grants.filter(g => g.actorId === 'sarah').forEach(g => { g.revokedAt = now; });
  assert.throws(() => applyCommand(s, command, ctx), errorCode('FORBIDDEN'));
});
