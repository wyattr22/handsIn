export class CoordinationError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'CoordinationError'; }
}
export function validateTimezone(zone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(); }
  catch { throw new CoordinationError('VALIDATION_FAILED', 'Choose a valid IANA timezone.'); }
}
export function parts(instant: string, zone: string) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const get = (type: string) => values.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
/** Exact round-trip search rejects nonexistent AND ambiguous DST local times, never silently shifts care. */
export function localToInstant(local: string, zone: string): string {
  validateTimezone(zone);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new CoordinationError('VALIDATION_FAILED', 'Enter a complete local date and time.');
  const wall = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(wall)) throw new CoordinationError('VALIDATION_FAILED', 'Invalid date.');
  const matches = new Set<string>();
  // All present-day IANA offsets fall within +/- 14 hours, in 15-minute increments.
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(wall - offset * 60000).toISOString();
    if (parts(candidate, zone) === local) matches.add(candidate);
  }
  if (matches.size !== 1) throw new CoordinationError('VALIDATION_FAILED', matches.size ? 'This time repeats during daylight saving. Choose an unambiguous time.' : 'This local time does not exist. Choose another time.');
  return [...matches][0];
}
export function validateInterval(start: string, end: string, zone: string) {
  validateTimezone(zone);
  if (!/Z$|[+-]\d\d:\d\d$/.test(start) || !/Z$|[+-]\d\d:\d\d$/.test(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) {
    throw new CoordinationError('VALIDATION_FAILED', 'End must be after start; timestamps must include an offset.');
  }
}
export function addLocalDays(instant: string, days: number, zone: string) {
  const local = parts(instant, zone);
  const date = new Date(`${local}:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return localToInstant(date.toISOString().slice(0, 16), zone);
}
export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}
