import { parts } from '../../server/domain/coordination/time';

export type CalendarMode = 'day' | 'week' | 'month' | 'year';
export interface CalendarEntry {
  id: string; title: string; recipientId: string; kind: 'appointment' | 'followup' | 'visit' | 'task';
  start: string; end: string; timezone: string; allDay?: boolean; taskId?: string; visitId?: string;
  canceled: boolean;
  category?: string;
}
export const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function civilDate(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choose a complete date.');
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error('Choose a valid date.');
  return date;
}
export function shiftDay(day: string, amount: number) { const date = civilDate(day); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
export function daysInMonth(day: string) { const d = civilDate(day); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); }
export function movePeriod(day: string, mode: CalendarMode, direction: number) {
  if (mode === 'day' || mode === 'week') return shiftDay(day, direction * (mode === 'week' ? 7 : 1));
  const d = civilDate(day), oldDay = d.getUTCDate();
  d.setUTCDate(1);
  if (mode === 'month') d.setUTCMonth(d.getUTCMonth() + direction); else d.setUTCFullYear(d.getUTCFullYear() + direction);
  d.setUTCDate(Math.min(oldDay, daysInMonth(d.toISOString().slice(0, 10))));
  return d.toISOString().slice(0, 10);
}
export function weekDays(day: string) { const start = shiftDay(day, -civilDate(day).getUTCDay()); return Array.from({ length: 7 }, (_, i) => shiftDay(start, i)); }
export function monthDays(day: string) {
  const first = `${day.slice(0, 7)}-01`, offset = civilDate(first).getUTCDay();
  const start = shiftDay(first, -offset), cellCount = Math.ceil((offset + daysInMonth(day)) / 7) * 7;
  return Array.from({ length: cellCount }, (_, i) => shiftDay(start, i));
}
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) { return civilDate(day).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' }); }
export function calendarTitle(day: string, mode: CalendarMode) {
  if (mode === 'year') return day.slice(0, 4);
  if (mode === 'month') return formatDay(day, { month: 'long', year: 'numeric' });
  if (mode === 'day') return formatDay(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const days = weekDays(day);
  return `${formatDay(days[0], { month: 'short', day: 'numeric', year: 'numeric' })} – ${formatDay(days[6], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
export function entriesOnDay(entries: CalendarEntry[], day: string, zone: string) {
  return entries.filter(e => {
    const timezone = e.allDay ? e.timezone : zone;
    return parts(e.start, timezone).slice(0, 10) <= day && parts(new Date(Date.parse(e.end) - 1).toISOString(), timezone).slice(0, 10) >= day;
  }).sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || Date.parse(a.start) - Date.parse(b.start));
}
export function clock(instant: string, zone: string) { return new Date(instant).toLocaleTimeString('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }); }
export function timeRange(entry: CalendarEntry, zone: string) {
  if (entry.allDay) {
    const startDay = parts(entry.start, entry.timezone).slice(0, 10), endDay = parts(new Date(Date.parse(entry.end) - 1).toISOString(), entry.timezone).slice(0, 10);
    return startDay === endDay ? 'All day' : `All day · ${formatDay(startDay, { month: 'short', day: 'numeric' })} – ${formatDay(endDay, { month: 'short', day: 'numeric' })}`;
  }
  const start = parts(entry.start, zone), end = parts(entry.end, zone);
  const sameDay = start.slice(0, 10) === end.slice(0, 10);
  return sameDay ? `${clock(entry.start, zone)} – ${clock(entry.end, zone)}` : `${formatDay(start.slice(0, 10), { month: 'short', day: 'numeric' })}, ${clock(entry.start, zone)} – ${formatDay(end.slice(0, 10), { month: 'short', day: 'numeric' })}, ${clock(entry.end, zone)}`;
}
export interface PositionedEntry { entry: CalendarEntry; startMinute: number; endMinute: number; column: number; columns: number }
/** Separate overlapping events into lanes, including chained overlaps and short visual targets. */
export function layoutTimedEvents(entries: CalendarEntry[], day: string, zone: string): PositionedEntry[] {
  const minute = (local: string) => Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
  const items: PositionedEntry[] = entriesOnDay(entries, day, zone).filter(e => !e.allDay).map(entry => {
    const start = parts(entry.start, zone), end = parts(entry.end, zone);
    const startMinute = start.slice(0, 10) < day ? 0 : minute(start);
    const endMinute = end.slice(0, 10) > day ? 1440 : minute(end);
    return { entry, startMinute, endMinute: Math.max(startMinute + 1, endMinute), column: 0, columns: 1 };
  }).sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
  let group: PositionedEntry[] = [], laneEnds: number[] = [], groupEnd = -1;
  const flush = () => { for (const item of group) item.columns = laneEnds.length; group = []; laneEnds = []; };
  for (const item of items) {
    if (item.startMinute >= groupEnd) flush();
    let column = laneEnds.findIndex(end => end <= item.startMinute);
    if (column < 0) column = laneEnds.length;
    const visualEnd = Math.max(item.endMinute, item.startMinute + 45);
    laneEnds[column] = visualEnd; item.column = column; group.push(item); groupEnd = Math.max(...laneEnds);
  }
  flush(); return items;
}
