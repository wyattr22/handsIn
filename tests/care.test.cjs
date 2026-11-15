const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeCareFixtures } = require('../.calendar-test-build/features/care/demo.js');
const { applyCare, effectiveLog, mealsEaten, projectCare } = require('../.calendar-test-build/server/domain/care/service.js');
const { checkMeal, mealFingerprint, shoppingList } = require('../.calendar-test-build/server/domain/care/guidance.js');
const { applyCommand, shouldDispatch } = require('../.calendar-test-build/server/domain/coordination/service.js');
const now = '2026-11-15T20:00:00Z', day = '2026-11-15';
let n = 0;
const ctx = (actorId = 'sarah', key = `care-test-${++n}`) => ({ actorId, now, idempotencyKey: key, newId: () => `test-${++n}` });
const fixture = () => makeCareFixtures(now);
const first = w => w.coordination.tasks.find(t => t.category === 'meal' && t.recipientId === 'r-alex');
const record = (w, actor = 'sarah', overrides = {}) => { const t = first(w); return applyCare(w, { type: 'record', taskId: t.id, expectedVersion: t.version, stage: 'consumed', amount: 'some', source: actor === 'patient-alex' ? 'self_reported' : 'observed', observedAt: now, note: 'A few bites of lentils actually eaten.', ...overrides }, ctx(actor)); };
test('primary, secondary, ordinary caregiver and own patient can record without reassignment', () => {
  for (const actor of ['sarah', 'ben', 'maya', 'patient-alex']) {
    const w = fixture(), before = structuredClone(w.coordination.assignments), out = record(w, actor).workspace;
    assert.equal(first(out).status, 'completed'); assert.deepEqual(out.coordination.assignments, before);
    assert.equal(out.logs.at(-1).actorId, actor); assert.equal(mealsEaten(out, 'r-alex', day), 1);
  }
});
test('unauthorized, expired, revoked and cross-patient access are rejected atomically', () => {
  for (const actor of ['guest', 'unrelated']) assert.throws(() => record(fixture(), actor), /Access is unavailable/);
  for (const change of [{ expiresAt: now }, { revokedAt: now }]) {
    const w = fixture(); w.coordination.grants.filter(g => g.actorId === 'ben').forEach(g => Object.assign(g, change));
    assert.throws(() => record(w, 'ben'), /Access is unavailable/);
  }
  const w = fixture(), t = w.coordination.tasks.find(t => t.category === 'meal' && t.recipientId === 'r-june');
  assert.throws(() => record(w, 'patient-alex', { taskId: t.id, expectedVersion: t.version }), /Access is unavailable/);
  assert.deepEqual(projectCare(w, 'patient-alex', now).profiles.map(p => p.recipientId), ['r-alex']);
  assert.equal(projectCare(w, 'guest', now).profiles.length, 0);
});
test('task-filtered guest cannot obtain the full health profile', () => {
  const w = fixture(); w.coordination.grants.push({ actorId: 'guest', recipientId: 'r-alex', circleId: 'demo-circle', taskIds: [first(w).id], permissions: ['read', 'perform'] });
  assert.equal(projectCare(w, 'guest', now).profiles.length, 0);
  assert.equal(projectCare(w, 'guest', now).guidance.length, 0);
});
test('prepared, offered and no amount never count as eating', () => {
  for (const overrides of [{ stage: 'prepared', amount: undefined }, { stage: 'offered', amount: undefined }, { amount: 'none' }, { stage: 'declined', amount: undefined }]) {
    const w = record(fixture(), 'ben', overrides).workspace; assert.equal(mealsEaten(w, 'r-alex', day), 0);
  }
});
test('concurrent recording fails and completed duplicate requires an explicit correction', () => {
  const w = fixture(), t = first(w), result = record(w).workspace;
  assert.throws(() => record(result, 'ben', { expectedVersion: t.version }), /changed/);
  assert.throws(() => record(result), /Already recorded/);
  assert.equal(result.logs.length, 1);
});
test('correction appends history, updates goal and never rewrites previous reporter', () => {
  const w = record(fixture(), 'ben').workspace, old = w.logs.at(-1);
  const out = record(w, 'patient-alex', { stage: 'declined', amount: undefined, correctsId: old.id, reason: 'That was prepared, not eaten.' }).workspace;
  assert.equal(out.logs.length, 2); assert.equal(out.logs[0].actorId, 'ben'); assert.equal(mealsEaten(out, 'r-alex', day), 0);
  assert.equal(effectiveLog(out, first(out).id).supersedesId, old.id);
  assert.ok(out.coordination.audit.some(a => a.action === 'careOutcome' && a.supersedesId));
});
test('corrections need the latest record and a reason', () => {
  const w = record(fixture()).workspace;
  assert.throws(() => record(w, 'sarah', { correctsId: 'old', reason: 'Fix' }), /latest/);
  assert.throws(() => record(w, 'sarah', { correctsId: w.logs.at(-1).id, reason: '' }), /reason/);
});
test('idempotency replay commits one record; reuse with changed payload fails', () => {
  const w = fixture(), t = first(w), c = { type: 'record', taskId: t.id, expectedVersion: t.version, stage: 'consumed', amount: 'all', source: 'observed', observedAt: now, note: 'Meal eaten.' }, context = ctx('ben');
  const r = applyCare(w, c, context); assert.equal(applyCare(r.workspace, c, context).workspace.logs.length, 1);
  assert.throws(() => applyCare(r.workspace, { ...c, note: 'Changed' }, context), /key already used/);
});
test('source attribution and future timestamps cannot be forged', () => {
  assert.throws(() => record(fixture(), 'ben', { source: 'self_reported' }), /source/);
  assert.throws(() => record(fixture(), 'patient-alex', { source: 'observed' }), /source/);
  assert.throws(() => record(fixture(), 'sarah', { observedAt: '2030-01-01T00:00:00Z' }), /future/);
});
test('shared outcome does not bypass medication or ordinary accepted-primary rules', () => {
  const w = fixture(), t = first(w); t.medicationOccurrenceId = 'real-med';
  assert.throws(() => record(w, 'ben'), /not a shared/);
  const s = fixture().coordination;
  assert.throws(() => applyCommand(s, { type: 'careOutcome', taskId: 't-ride', expectedVersion: 1, status: 'completed', detail: 'Done', source: 'observed', observedAt: now }, ctx('ben')), /unavailable/);
  assert.throws(() => applyCommand(s, { type: 'outcome', taskId: first({ coordination: s }).id, expectedVersion: first({ coordination: s }).version, status: 'completed', detail: 'Done' }, ctx()), /Meals & daily care/);
});
test('known allergy blocks a recipe and substitutions are rechecked', () => {
  const w = fixture(), meal = w.meals[0]; meal.recipeId = 'yogurt-bowl';
  assert.match(checkMeal(w, meal).blocked.join(' '), /allergy/);
  meal.substitutions = { yogurt: 'lentil' }; assert.equal(checkMeal(w, meal).blocked.length, 0);
  meal.substitutions = { yogurt: 'almond' }; w.profiles[0].allergies = ['tree nuts'];
  assert.match(checkMeal(w, meal).blocked.join(' '), /allergy/);
});
test('unknown allergies are never treated as no allergies; interactions are never all clear', () => {
  const w = fixture(), m = w.meals.find(m => w.coordination.tasks.find(t => t.id === m.taskId)?.recipientId === 'r-june');
  assert.match(checkMeal(w, m).review.join(' '), /not been confirmed/);
  assert.match(checkMeal(w, m).review.join(' '), /not connected/);
});
test('dietary restrictions and medication food avoidances are cumulative', () => {
  const w = fixture(), m = w.meals[0]; m.recipeId = 'rice-bowl'; w.profiles[0].avoidIngredients = ['meat'];
  assert.match(checkMeal(w, m).blocked.join(' '), /restriction/);
  w.guidance[0].avoidIngredients = ['rice']; assert.match(checkMeal(w, m).blocked.join(' '), /food conflict/);
});
test('meal reviews become stale after profile, medication and calendar-time changes', () => {
  for (const mutate of [w => w.profiles[0].version++, w => w.guidance[0].version++, w => first(w).start = '2026-11-15T18:00:00Z']) {
    const w = fixture(), m = w.meals[0], fp = mealFingerprint(w, m); mutate(w);
    assert.notEqual(mealFingerprint(w, m), fp);
    assert.throws(() => applyCare(w, { type: 'reviewMeal', mealId: m.id, expectedVersion: m.version, fingerprint: fp }, ctx()), /changed/);
  }
});
test('food separation uses only confirmed intervals, including adjacent dates', () => {
  const w = fixture(), m = w.meals[0], t = first(w), g = w.guidance[0];
  g.rule = 'separate'; g.minutesBefore = 60; g.minutesAfter = 120; g.localTimes = ['00:00'];
  t.start = '2026-11-16T07:30:00Z'; t.end = '2026-11-16T08:00:00Z';
  assert.match(checkMeal(w, m).blocked.join(' '), /separation/);
  delete g.minutesBefore; assert.match(checkMeal(w, m).review.join(' '), /missing/);
});
test('unsafe proposed recipe fails atomically but actual food consumption remains recordable', () => {
  const w = fixture(), t = first(w), before = structuredClone(w);
  assert.throws(() => applyCare(w, { type: 'planMeal', recipientId: 'r-alex', start: t.start, end: t.end, name: 'Unsafe', recipeId: 'yogurt-bowl', servings: 1, substitutions: {} }, ctx()), /allergy/);
  assert.deepEqual(w, before); assert.equal(record(w).workspace.logs.length, 1);
});
test('routine generation is repeatable, bounded and uses shared calendar occurrences', () => {
  const w = fixture(), before = w.coordination.tasks.length;
  const out = applyCare(w, { type: 'scheduleRoutines', recipientId: 'r-alex', firstDay: day, days: 7 }, ctx()).workspace;
  assert.equal(out.coordination.tasks.length, before);
  assert.throws(() => applyCare(w, { type: 'scheduleRoutines', recipientId: 'r-alex', firstDay: day, days: 15 }, ctx()), /14 days/);
  assert.ok(w.coordination.tasks.some(t => t.category === 'daily_care' && t.recordingPolicy === 'shared_care' && t.instructionVersion));
});
test('routine edits retire future unfinished items, preserve completed history, regenerate revised versions', () => {
  let w = fixture(), routine = w.routines[0];
  const original = w.coordination.tasks.find(t => t.seriesId === routine.id); original.status = 'completed';
  w = applyCare(w, { type: 'saveRoutine', routine: { ...routine, time: '11:00' }, expectedVersion: routine.version }, ctx()).workspace;
  assert.equal(w.coordination.tasks.find(t => t.id === original.id).status, 'completed');
  assert.ok(w.coordination.tasks.some(t => t.seriesId === routine.id && t.status === 'canceled'));
  w = applyCare(w, { type: 'scheduleRoutines', recipientId: 'r-alex', firstDay: day, days: 7 }, ctx()).workspace;
  assert.ok(w.coordination.tasks.some(t => t.seriesId === routine.id && t.instructionVersion === 2));
});
test('skin observation stays open after check completion; coordinator follow-up is separately audited', () => {
  let w = fixture(); const t = w.coordination.tasks.find(t => t.title === 'Skin & comfort check');
  const obs = applyCare(w, { type: 'observe', recipientId: 'r-alex', taskId: t.id, kind: 'skin_change', location: 'Left heel', description: 'Red area noticed; no diagnosis.', source: 'observed', observedAt: now }, ctx('ben')); w = obs.workspace;
  w = applyCare(w, { type: 'record', taskId: t.id, expectedVersion: t.version, stage: 'completed', source: 'observed', observedAt: now, note: 'Check done, concern needs follow-up.' }, ctx('ben')).workspace;
  assert.equal(w.coordination.observations[0].status, 'open');
  const event = w.coordination.outbox.find(e => e.observationId === obs.resultId);
  assert.equal(shouldDispatch(w.coordination, event.id, now), true);
  assert.throws(() => applyCare(w, { type: 'followUp', observationId: obs.resultId, expectedVersion: 1, status: 'resolved', note: 'Done' }, ctx('ben')), /Access is unavailable/);
  w = applyCare(w, { type: 'followUp', observationId: obs.resultId, expectedVersion: 1, status: 'resolved', note: 'Care team contacted; follow-up plan confirmed.' }, ctx()).workspace;
  assert.equal(shouldDispatch(w.coordination, event.id, now), false);
  assert.ok(w.coordination.audit.some(a => a.action === 'care:followUp'));
});
test('shopping list scales recipe quantities and maintains explicit units', () => {
  const w = fixture(), list = shoppingList(w, 'r-alex', day);
  assert.equal(list.find(i => i.name === 'Cooked lentils').amount, 1);
  assert.equal(list.find(i => i.name === 'Carrot').amount, 2);
});
test('goal uses actual observation date rather than planned date', () => {
  const w = record(fixture(), 'ben', { observedAt: '2026-11-14T20:00:00Z' }).workspace;
  assert.equal(mealsEaten(w, 'r-alex', day), 0); assert.equal(mealsEaten(w, 'r-alex', '2026-11-14'), 1);
});
test('category-restricted scheduling access cannot read care profiles or record meals', () => {
  const w = fixture(); w.coordination.grants.filter(g => g.actorId === 'ben').forEach(g => { g.categories = ['transport', 'companionship']; });
  assert.equal(projectCare(w, 'ben', now).profiles.length, 0);
  assert.throws(() => record(w, 'ben'), /Access is unavailable/);
  const t = first(w);
  assert.throws(() => applyCommand(w.coordination, { type: 'createTask', input: { recipientId: 'r-alex', title: 'Meal', category: 'meal', start: t.start, end: t.end, timezone: t.timezone } }, ctx('ben')), /Access is unavailable/);
});
test('unknown allergy terms require manual review and known names match without case sensitivity', () => {
  const w = fixture(), m = w.meals[0]; w.profiles[0].allergies = ['Unlisted allergen'];
  assert.match(checkMeal(w, m).review.join(' '), /outside the ingredient catalog/);
  w.profiles[0].allergies = ['MILK']; m.recipeId = 'yogurt-bowl'; assert.match(checkMeal(w, m).blocked.join(' '), /allergy/);
});
test('meal-only category grants do not expose appointment details', () => {
  const w = fixture(); w.coordination.grants.filter(g => g.actorId === 'ben').forEach(g => { g.categories = ['meal']; });
  const { projectView } = require('../.calendar-test-build/server/domain/coordination/service.js');
  assert.equal(projectView(w.coordination, 'ben', now).visits.length, 0);
});
test('care projection omits unrelated category tasks, instructions and appointments', () => {
  const w = fixture(); w.coordination.grants.filter(g => g.actorId === 'ben').forEach(g => { g.categories = ['meal', 'daily_care']; });
  const v = projectCare(w, 'ben', now);
  assert.equal(v.profiles.length, 2); assert.equal(v.coordination.visits.length, 0);
  assert.ok(v.coordination.tasks.every(t => ['meal', 'daily_care'].includes(t.category)));
  assert.ok(!v.coordination.instructions.some(i => i.id === 'i-walk'));
});
