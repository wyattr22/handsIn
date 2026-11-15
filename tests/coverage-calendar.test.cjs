const test = require('node:test');
const assert = require('node:assert/strict');
const { createDemoStore, applyCoverage, viewCoverage } = require('../.calendar-test-build/features/coverage/domain.js');
const { projectCoverageCalendar, calendarAttendance, coverageVisitId } = require('../.calendar-test-build/features/coverage/calendar-connection.js');
const { makeFixtures } = require('../.calendar-test-build/features/coordination/demo/fixtures.js');
const { projectView } = require('../.calendar-test-build/server/domain/coordination/service.js');
const { DEMO_RECIPIENTS, DEMO_HELPERS } = require('../.calendar-test-build/features/coordination/demo/people.js');
const before = '2026-11-15T18:00:00Z', during = '2026-11-15T22:05:00Z';
let serial=0;
function act(s, command, actor='sarah', now=before) {
  return applyCoverage(s,{ coverageId:'alex', expectedVersion:s.coverages[0].version, operationId:`bridge-${++serial}`,command },actor,now);
}
function invite() { return act(createDemoStore(),{type:'invite',taskIds:['alex-bag'],originalAvailable:false,reviewed:true}); }
function accept() {return act(invite(),{type:'respond',response:'accepted'},'ben');}
function calendar(s, actor='sarah', now=before) {return projectView(projectCoverageCalendar(makeFixtures(before),s,actor,now),actor,now);}

test('coverage and calendar use the same acceptance, helper and recipient',()=>{
  const pending=invite(); assert.match(calendarAttendance(pending.coverages[0],before),/Ben invited.*not confirmed/);
  const accepted=accept(); assert.match(calendarAttendance(accepted.coverages[0],before),/Ben with Alex.*confirmed, arrival not reported/);
  assert(calendar(accepted).visits.some(v=>v.id===coverageVisitId('alex')));
  assert.equal(viewCoverage(accepted,'alex','ben',before).kind,'handoff');
});
test('arrival from the shared command is visible on both screens, without completing care',()=>{
  const s=act(accept(),{type:'arrive'},'ben',during);
  assert.match(calendarAttendance(s.coverages[0],during),/Ben with Alex.*arrival reported 2:05 PM PST/);
  assert.equal(viewCoverage(s,'alex','ben',during).coverage.arrivedAt,during);
  assert(calendar(s,'sarah',during).tasks.filter(t=>t.visitId===coverageVisitId('alex')).every(t=>t.status==='open'));
  assert.throws(()=>act(s,{type:'arrive'},'ben',during),/already recorded/);
});
test('pending calendar invitation exposes neither home details nor omitted task instructions',()=>{
  const s=invite(), view=calendar(s,'ben');
  const visit=view.visits.find(v=>v.id===coverageVisitId('alex'));
  assert.equal(visit.location,'Fictional neighborhood'); assert.equal(visit.notes,'');
  assert.equal(view.instructions.some(i=>i.text.includes('front bench')),false);
  assert.deepEqual(view.tasks.filter(t=>t.id.startsWith('coverage-task:')).map(t=>t.title),['Bring the grocery bag inside']);
  assert.equal(view.visits.some(v=>v.id===coverageVisitId('june')),false);
});
test('unrelated accounts cannot see coverage calendar records; expiry keeps coordinator history only',()=>{
  let s=accept(); assert.equal(calendar(s,'unrelated').visits.length,0);
  s=act(s,{type:'arrive'},'ben',during); const end=s.coverages[0].end;
  assert.equal(calendar(s,'ben',end).visits.some(v=>v.id===coverageVisitId('alex')),false);
  assert.match(calendarAttendance(s.coverages[0],end),/visit ended.*arrival reported/);
  assert(calendar(s,'sarah',end).visits.some(v=>v.id===coverageVisitId('alex')));
});
test('projection never mutates or duplicates native calendar tasks, assignments or backups',()=>{
  const base=makeFixtures(before); const copy=structuredClone(base); const s=accept();
  const first=projectCoverageCalendar(base,s,'sarah',before), second=projectCoverageCalendar(base,s,'sarah',before);
  assert.deepEqual(base,copy); assert.deepEqual(first,second);
  assert.deepEqual(first.assignments,base.assignments);
  assert.equal(new Set(first.visits.map(v=>v.id)).size,first.visits.length);
});
test('reports, withdrawal and cancellation update calendar without implying care completion',()=>{
  const reported=act(accept(),{type:'report',note:'No care result recorded.'},'ben',during);
  assert.match(calendarAttendance(reported.coverages[0],during),/report received.*no arrival report/);
  assert(calendar(reported,'sarah',during).tasks.filter(t=>t.visitId===coverageVisitId('alex')).every(t=>t.status==='open'));
  const withdrawn=act(accept(),{type:'withdraw'},'ben',during);
  assert.match(calendarAttendance(withdrawn.coverages[0],during),/coverage needed/);
  const canceled=act(accept(),{type:'cancel'});
  assert(calendar(canceled).visits.find(v=>v.id===coverageVisitId('alex')).canceled);
});

test('shared identities do not duplicate recipient records; coordinator cannot report a helper arrival',()=>{
  const s=accept(); const projected=projectCoverageCalendar(makeFixtures(before),s,'sarah',before);
  assert.equal(new Set(projected.recipients.map(r=>r.id)).size,projected.recipients.length);
  for(const c of s.coverages){assert(DEMO_RECIPIENTS.some(p=>p.id===c.recipientId && p.preferredName===c.name));assert(DEMO_HELPERS.some(h=>h.id===c.helperId));}
  assert.throws(()=>act(s,{type:'arrive'},'sarah',during),/unavailable|ended/);
  assert.equal(s.coverages[0].arrivedAt,undefined);
});
