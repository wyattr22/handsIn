import type { CoordinationState } from '../../contracts/coordination';
import type { Coverage, DemoStore } from './domain';
import { viewCoverage } from './domain';

export const coverageVisitId = (id: string) => `coverage-visit:${id}`;
export const coverageTaskId = (id: string) => `coverage-task:${id}`;
export function linkedCoverage(store: DemoStore, entry: { visitId?: string; taskId?: string; id: string }) {
  return store.coverages.find(c => coverageVisitId(c.id) === (entry.visitId || entry.id) || c.tasks.some(t => coverageTaskId(t.id) === entry.taskId));
}
/** Read-only adapter, NOT a second task store. Rebuilt from canonical demo coverage
 * records on every render. All writes for these IDs go through applyCoverage.
 * Production must bind the existing shared task/visit IDs instead of demo IDs. */
export function projectCoverageCalendar(base: CoordinationState, store: DemoStore, actor: string, now: string): CoordinationState {
  const result = structuredClone(base);
  for (const original of store.coverages) {
    const projection = viewCoverage(store, original.id, actor, now);
    if (projection.kind === 'unavailable' || projection.kind === 'receipt') continue;
    const c = projection.kind === 'preview' ? original : projection.coverage;
    const coordinator = projection.kind === 'coordinator';
    const detailsAllowed = coordinator || projection.kind === 'handoff';
    const circleId = 'demo-circle';
    const visitId = coverageVisitId(c.id);
    const tasks = c.tasks.filter(t => coordinator || c.taskIds.includes(t.id));
    if (!result.recipients.some(r => r.id === c.recipientId)) result.recipients.push({ id: c.recipientId, circleId, name: c.name, timezone: c.timezone });
    for (const [id, name] of [[c.coordinatorId, c.coordinatorName], [c.helperId, c.helperName]]) {
      if (!result.helpers.some(h => h.id === id)) result.helpers.push({ id, name, categories: ['household', 'companionship'], unavailable: [] });
    }
    // This temporary read projection is local-only. It never enables native writes.
    result.grants.push({ actorId: actor, recipientId: c.recipientId, circleId, permissions: ['read'] });
    result.visits.push({ id: visitId, circleId, recipientId: c.recipientId, title: `${c.name}'s care visit`, kind: 'visit', start: c.start, end: c.end, timezone: c.timezone,
      location: detailsAllowed ? c.address : c.area, provider: '', notes: detailsAllowed ? c.preference : '', version: c.version, canceled: c.state === 'canceled' });
    for (const t of tasks) {
      const taskId = coverageTaskId(t.id);
      result.tasks.push({ id: taskId, circleId, recipientId: c.recipientId, visitId, title: t.title, category: t.category, start: c.start, end: c.end, timezone: c.timezone,
        status: t.outcome === 'uncertain' ? 'unable_to_complete' : t.outcome || 'open', version: t.version });
    }
  }
  return result;
}

/** A check-in reports an arrival; it never claims ongoing physical presence. */
export function calendarAttendance(c: Coverage, now: string) {
  const ended = Date.parse(now) >= Date.parse(c.end);
  const reportedTime = c.arrivedAt ? new Intl.DateTimeFormat('en-US', { timeZone: c.timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(c.arrivedAt)) : '';
  const who = `${c.helperName} with ${c.name}`;
  if (c.state === 'canceled') return `${c.name} · coverage canceled${reportedTime ? ` · ${c.helperName} reported arrival ${reportedTime}` : ''}`;
  if (c.state === 'closed') return `${who} · report received${reportedTime ? ` · arrival reported ${reportedTime}` : ' · no arrival report'}`;
  if (ended) return `${who} · visit ended${reportedTime ? ` · arrival reported ${reportedTime}` : ' · arrival not confirmed'}`;
  if (c.state === 'confirmed') return reportedTime ? `${who} · arrival reported ${reportedTime}` : `${who} · confirmed, arrival not reported`;
  if (c.invitation === 'pending' && Date.parse(now) < Date.parse(c.respondBy)) return `${c.helperName} invited · ${c.originalAvailable ? c.coordinatorName + ' remains available' : 'not confirmed'}`;
  return `${c.name} · ${c.originalAvailable ? c.coordinatorName + ' remains available' : 'coverage needed'}`;
}
