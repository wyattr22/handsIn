import type { CareWorkspace } from '../../../contracts/care';
/** Read projection: medication times always come from canonical medication occurrences. */
export function medicationCalendarState(w: CareWorkspace) {
  return { ...w.coordination, tasks: w.coordination.tasks.map(t => {
    if (!t.medicationOccurrenceId) return t;
    const d = w.medicationOccurrences?.find(d => d.id === t.medicationOccurrenceId && d.recipientId === t.recipientId);
    if (!d || d.status === 'canceled' || !Number.isFinite(Date.parse(d.at))) return { ...t, status: 'canceled' as const };
    return { ...t, start: d.at, end: new Date(Date.parse(d.at) + 15 * 60000).toISOString(), timezone: d.timezone };
  }) };
}
