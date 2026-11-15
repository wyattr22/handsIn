'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { calendarTitle, clock, daysInMonth, entriesOnDay, formatDay, layoutTimedEvents, monthDays, shiftDay, weekdays, weekDays } from './calendarMath';
import type { CalendarEntry, CalendarMode } from './calendarMath';
import styles from './calendar.module.css';

interface Props {
  mode: CalendarMode; selected: string; today: string; timezone: string; entries: CalendarEntry[];
  onDate: (day: string, openDay?: boolean) => void; onMonth: (day: string) => void;
  onEvent: (entry: CalendarEntry) => void; onAdd: (day: string, hour?: number) => void;
  recipientName: (id: string) => string; recipientStyle: (id: string) => CSSProperties; coverageLabel: (entry: CalendarEntry) => string; canAdd: boolean;
}
export const kindLabel = (entry: CalendarEntry) => ({ appointment: 'Appointment', followup: 'Follow-up', visit: 'Care visit', task: 'Care task' })[entry.kind];
function dateKeys(event: KeyboardEvent<HTMLButtonElement>, day: string, onDate: Props['onDate']) {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (event.key in steps) { event.preventDefault(); onDate(shiftDay(day, steps[event.key])); }
}
function MonthGrid({ p }: { p: Props }) {
  const ref = useRef<HTMLDivElement>(null);
  const arrowFocus = useRef(false);
  useEffect(() => { if (arrowFocus.current) { ref.current?.querySelector<HTMLButtonElement>(`button[data-date="${p.selected}"]`)?.focus(); arrowFocus.current = false; } }, [p.selected]);
  return <div className={styles.monthGrid} ref={ref} aria-label={calendarTitle(p.selected, 'month')}>
    {weekdays.map(d => <div className={styles.weekday} key={d}>{d}</div>)}
    {monthDays(p.selected).map(day => {
      const events = entriesOnDay(p.entries, day, p.timezone);
      return <div key={day} className={`${styles.monthCell} ${day.slice(0, 7) !== p.selected.slice(0, 7) ? styles.outsideMonth : ''} ${day === p.selected ? styles.selectedCell : ''}`}>
        <button type="button" className={`${styles.dateButton} ${day === p.today ? styles.todayDate : ''}`} data-date={day} aria-current={day === p.today ? 'date' : undefined} aria-pressed={day === p.selected} aria-label={`${formatDay(day)}${events.length ? `, ${events.length} scheduled items` : ', no scheduled items'}`} onClick={() => {
          p.onDate(day);
          if (window.matchMedia('(max-width:650px)').matches) requestAnimationFrame(() => document.getElementById('calendar-day-schedule')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
        }} onKeyDown={e => { if (e.key.startsWith('Arrow')) arrowFocus.current = true; dateKeys(e, day, p.onDate); }}>{Number(day.slice(8))}</button>
        <div className={styles.cellEvents}>{events.slice(0, 2).map(entry => <button type="button" key={entry.id} style={p.recipientStyle(entry.recipientId)} className={`${styles.monthEvent} ${styles[entry.kind]} ${entry.canceled ? styles.canceledEvent : ''}`} onClick={() => p.onEvent(entry)} aria-label={`${kindLabel(entry)}: ${entry.title}, ${p.recipientName(entry.recipientId)}, ${p.coverageLabel(entry)}`}>
          <span className={styles.eventTime}>{entry.allDay ? 'All day' : clock(entry.start, p.timezone)}</span><span className={styles.eventTitle}>{entry.title}</span><span className={styles.tileRecipient}>{p.recipientName(entry.recipientId)}</span>{entry.id.startsWith('coverage-visit:') ? <span className={styles.tileAttendance}>{p.coverageLabel(entry)}</span> : null}
        </button>)}</div>
        {events.length > 2 && <button type="button" className={styles.moreButton} onClick={() => p.onDate(day, true)}>+{events.length - 2} more</button>}
        {events.length > 0 && <span className={styles.mobileDots} aria-hidden="true">{events.length} item{events.length !== 1 ? 's' : ''}</span>}
      </div>;
    })}
  </div>;
}
function YearGrid({ p }: { p: Props }) {
  return <div className={styles.yearGrid} aria-label={`Calendar year ${p.selected.slice(0, 4)}`}>
    {Array.from({ length: 12 }, (_, i) => `${p.selected.slice(0, 4)}-${String(i + 1).padStart(2, '0')}-01`).map(month => <section className={styles.miniMonth} key={month}>
      <button type="button" className={styles.miniMonthTitle} onClick={() => p.onMonth(`${month.slice(0, 7)}-${String(Math.min(Number(p.selected.slice(8)), daysInMonth(month))).padStart(2, '0')}`)}>{formatDay(month, { month: 'long' })}<span aria-hidden="true">↗</span></button>
      <div className={styles.miniGrid}>{weekdays.map(d => <span className={styles.miniWeekday} key={d}>{d[0]}</span>)}{monthDays(month).map(day => {
        if (day.slice(0, 7) !== month.slice(0, 7)) return <span key={day} />;
        const events = entriesOnDay(p.entries, day, p.timezone);
        return <button type="button" className={`${styles.miniDate} ${day === p.today ? styles.todayDate : ''} ${day === p.selected ? styles.miniSelected : ''}`} key={day} onClick={() => p.onDate(day, true)} aria-label={`${formatDay(day)}, ${events.length} scheduled items`} aria-current={day === p.today ? 'date' : undefined}>{Number(day.slice(8))}{events.length > 0 && <i aria-hidden="true" />}</button>;
      })}</div>
    </section>)}
  </div>;
}
function TimeGrid({ p }: { p: Props }) {
  const dates = p.mode === 'week' ? weekDays(p.selected) : [p.selected];
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * 66; }, [p.mode, p.selected]);
  return <div className={styles.timeViewport}>
    <div className={styles.timeWidth} style={{ minWidth: p.mode === 'week' ? 850 : 0 }}>
      <div className={styles.timeHeader} style={{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }}><div className={styles.timezoneLabel}>Local<br />time</div>{dates.map(day => <button type="button" className={`${styles.dayHeading} ${day === p.today ? styles.currentDayHeading : ''}`} key={day} onClick={() => p.onDate(day, true)} aria-label={`Open ${formatDay(day)}`}><span>{formatDay(day, { weekday: 'short' })}</span><strong>{Number(day.slice(8))}</strong></button>)}</div>
      <div className={styles.allDayGrid} style={{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }}><span>All day</span>{dates.map(day => <div key={day}>{entriesOnDay(p.entries, day, p.timezone).filter(e => e.allDay).map(entry => <button key={entry.id} type="button" style={p.recipientStyle(entry.recipientId)} className={`${styles.allDayEvent} ${styles[entry.kind]}`} onClick={() => p.onEvent(entry)}>{entry.title}<span>{p.recipientName(entry.recipientId)}</span></button>)}</div>)}</div>
      <div className={styles.timeScroll} ref={scroller} tabIndex={0} role="region" aria-label="Hourly calendar. Scroll for earlier or later times.">
        <div className={styles.timeBody} style={{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }}>
          <div className={styles.hourLabels}>{Array.from({ length: 24 }, (_, h) => <div key={h}>{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</div>)}</div>
          {dates.map(day => <div key={day} className={styles.timeColumn}>
            {Array.from({ length: 24 }, (_, hour) => <button key={hour} type="button" className={styles.timeSlot} disabled={!p.canAdd} aria-label={`Add an event on ${formatDay(day)} at ${hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}`} onClick={() => p.onAdd(day, hour)} />)}
            {layoutTimedEvents(p.entries, day, p.timezone).map(({ entry, startMinute, endMinute, column, columns }) => <button type="button" key={entry.id} className={`${styles.timedEvent} ${styles[entry.kind]} ${entry.canceled ? styles.canceledEvent : ''}`} style={{ ...p.recipientStyle(entry.recipientId), top: startMinute * 1.1, height: Math.max(48, (endMinute - startMinute) * 1.1 - 3), left: `calc(${column * 100 / columns}% + 3px)`, width: `calc(${100 / columns}% - 6px)` }} onClick={() => p.onEvent(entry)} aria-label={`${kindLabel(entry)}: ${entry.title}, ${p.recipientName(entry.recipientId)}, ${p.coverageLabel(entry)}`}><strong>{entry.title}</strong><span>{clock(entry.start, p.timezone)} – {clock(entry.end, p.timezone)}</span><span>{p.recipientName(entry.recipientId)}</span>{entry.id.startsWith('coverage-visit:') ? <span>{p.coverageLabel(entry)}</span> : null}</button>)}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}
export default function CalendarViews(props: Props) {
  if (props.mode === 'month') return <MonthGrid p={props} />;
  if (props.mode === 'year') return <YearGrid p={props} />;
  return <TimeGrid p={props} />;
}
