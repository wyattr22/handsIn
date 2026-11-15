const test = require('node:test');
const assert = require('node:assert/strict');
const { createDemoStore, applyCoverage } = require('../.calendar-test-build/features/coverage/domain.js');
const { homeSummary } = require('../.calendar-test-build/features/coverage/home-summary.js');
const now = '2026-11-15T18:00:00Z';
let serial = 0;
function command(s, cmd, actor='sarah', at=now) {
  return applyCoverage(s, {coverageId:'alex', expectedVersion:s.coverages[0].version, operationId:`home-${++serial}`, command:cmd}, actor, at);
}
function invited() { return command(createDemoStore(), {type:'invite', taskIds:['alex-bag'], reviewed:true, originalAvailable:false}); }
test('Home limits pending, missing and unrelated projections', () => {
  const s=invited();
  assert.equal(homeSummary(s,'alex','ben',now).action,'Review invitation');
  assert.equal(homeSummary(s,'june','ben',now).status,'No shared handoff');
  assert.equal(homeSummary(s,'missing','sarah',now).status,'No shared handoff');
  const restricted=homeSummary(s,'alex','unrelated',now);
  assert.equal(restricted.start,undefined);
  assert.doesNotMatch(JSON.stringify(restricted),/Ben|address|grocery/);
});
test('Home distinguishes acceptance, arrival, expiry and unresolved report', () => {
  let s=command(invited(),{type:'respond',response:'accepted'},'ben');
  assert.match(homeSummary(s,'alex','sarah',now).detail,/confirmed, arrival not reported/);
  const during='2026-11-15T22:05:00Z';
  s=command(s,{type:'arrive'},'ben',during);
  assert.match(homeSummary(s,'alex','sarah',during).detail,/arrival reported/);
  assert.equal(homeSummary(s,'alex','ben',s.coverages[0].end).status,'No shared handoff');
  s=command(s,{type:'report',note:'Needs follow-up'},'ben',during);
  assert.match(homeSummary(s,'alex','sarah',during).followup,/1 task to review/);
  assert.equal(homeSummary(s,'alex','ben',during).action,'View receipt');
});
