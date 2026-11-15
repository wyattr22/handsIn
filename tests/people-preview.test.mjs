import test from 'node:test';
import assert from 'node:assert/strict';
import { includesCategory, effectiveAccess, canSeeTask, canRespond, initialPeople, initialTasks } from '../src/features/people/preview-domain.ts';
const people = initialPeople();
const james = people.find(p => p.id === 'james');
const maya = people.find(p => p.id === 'maya');
const now = new Date('2026-11-14T18:00:00Z');
const grant = (access, extra = {}) => ({ id: 'vacation', name: 'Trip', description: '', members: ['james', 'maya'], start: '2026-11-14T00:00:00Z', end: '2026-11-15T00:00:00Z', approved: true, overrides: { james: access, maya: access }, ...extra });
test('tiers are cumulative; health reports require tier 3', () => {
  assert.equal(includesCategory({ tier: 1 }, 'tasks'), true);
  assert.equal(includesCategory({ tier: 1 }, 'medications'), true);
  assert.equal(includesCategory({ tier: 1 }, 'meals'), false);
  assert.equal(includesCategory({ tier: 2 }, 'medications'), true);
  assert.equal(includesCategory({ tier: 2 }, 'care'), true);
  assert.equal(includesCategory({ tier: 2 }, 'health'), false);
  assert.equal(includesCategory({ tier: 3 }, 'health'), true);
});
test('advanced configuration can both restrict and expand a tier', () => {
  assert.equal(includesCategory({ tier: 1, overrides: { health: true } }, 'health'), true);
  assert.equal(includesCategory({ tier: 3, overrides: { health: false } }, 'health'), false);
  assert.equal(includesCategory({ tier: 0, overrides: { health: true } }, 'health'), false);
});
test('temporary grants replace regular access while active', () => {
  const access = effectiveAccess(james, 'grandma', [grant({ tier: 1 })], now);
  assert.equal(access.tier, 1);
  assert.equal(includesCategory(access, 'care'), false);
});
test('strongest overlapping grant wins per category, including custom exceptions', () => {
  const access = effectiveAccess(james, 'grandma', [grant({ tier: 1, overrides: { health: true } }), grant({ tier: 2 })], now);
  assert.equal(access.tier, 2);
  assert.equal(includesCategory(access, 'health'), true);
  assert.equal(includesCategory(access, 'meals'), true);
});
test('at expiry regular access returns; a temporary-only helper loses family access', () => {
  const end = new Date('2026-11-15T00:00:00Z');
  assert.equal(effectiveAccess(james, 'grandma', [grant({ tier: 3 })], end).tier, 2);
  assert.equal(effectiveAccess(maya, 'grandma', [grant({ tier: 3 })], end).tier, 0);
});
test('unapproved and future subgroups grant no access', () => {
  assert.equal(effectiveAccess(maya, 'grandma', [grant({ tier: 3 }, { approved: false })], now).tier, 0);
  assert.equal(effectiveAccess(maya, 'grandma', [grant({ tier: 3 }, { start: '2026-11-16T00:00:00Z' })], now).tier, 0);
});
test('recipient access stays separate', () => {
  assert.equal(effectiveAccess(maya, 'grandpa', [grant({ tier: 3 })], now).tier, 0);
  assert.equal(effectiveAccess(james, 'grandpa', [grant({ tier: 3 })], now).tier, 1);
});
test('private health task details are filtered out for tier 1; subgroup membership also applies', () => {
  const health = initialTasks().find(t => t.category === 'health');
  const task = initialTasks()[0];
  assert.equal(canSeeTask(maya, health, [grant({ tier: 1 })], now), false);
  assert.equal(canSeeTask(maya, task, [grant({ tier: 1 })], now), true);
  assert.equal(canSeeTask(james, task, [grant({ tier: 1 }, { members: ['maya'] })], now), false);
});
test('only the intended helper can accept a requested assignment', () => {
  const task = initialTasks()[0];
  assert.equal(canRespond(maya, task), true);
  assert.equal(canRespond(james, task), false);
  assert.equal(canRespond(maya, { ...task, status: 'accepted' }), false);
});
