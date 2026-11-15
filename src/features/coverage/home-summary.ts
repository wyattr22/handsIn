import { viewCoverage, coverageLabel } from './domain';
import type { DemoStore } from './domain';
import { calendarAttendance } from './calendar-connection';

/** Derived from the handoff projection, never a second mutable status store. */
export function homeSummary(store: DemoStore, id: string, actor: string, now: string) {
  const view = viewCoverage(store, id, actor, now);
  if (view.kind === 'unavailable') return { status: 'No shared handoff', detail: 'Ask your care organizer if you need access to this person’s handoff.', action: 'View access details' };
  if (view.kind === 'receipt') return { status: 'Report received', detail: view.message, action: 'View receipt' };
  if (view.kind === 'preview') return { status: 'Invitation waiting', detail: `${view.coordinatorName} invited you to help. Review the visit before accepting.`, action: 'Review invitation' };
  const c = view.coverage;
  const unresolved = c.tasks.filter(t => c.taskIds.includes(t.id) && t.outcome !== 'completed');
  const closed = c.state === 'closed' || c.state === 'canceled' || Date.parse(now) >= Date.parse(c.end);
  const action = closed ? 'Review follow-up' : c.state === 'draft' ? 'Arrange coverage' : c.state === 'seeking' ? 'Review coverage request' : view.kind === 'handoff' ? 'Prepare for your visit' : 'Review visit';
  return { status: coverageLabel(c, now), detail: calendarAttendance(c, now), action,
    start: c.start, end: c.end, timezone: c.timezone,
    followup: closed && unresolved.length ? `${unresolved.length} task${unresolved.length === 1 ? '' : 's'} to review with the care organizer. Respect any declined care; review what support is wanted next.` : undefined };
}
