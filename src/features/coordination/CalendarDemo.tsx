'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { DEMO_RECIPIENTS } from './demo/people';
import type { CoordinationCommand, CoordinationState, Task } from '../../contracts/coordination';
import { applyCommand, assignmentConflicts, authorize, coverage, projectView } from '../../server/domain/coordination/service';
import { localToInstant, parts } from '../../server/domain/coordination/time';
import CalendarViews, { kindLabel } from './CalendarViews';
import CalendarDialog from './CalendarDialog';
import EventEditor, { roleLabel } from './EventEditor';
import CaregiverPanel from './CaregiverPanel';
import { calendarTitle, entriesOnDay, formatDay, movePeriod, shiftDay, timeRange, weekDays } from './calendarMath';
import type { CalendarEntry, CalendarMode } from './calendarMath';
import { useCoverageWorkspace } from '../coverage/DemoWorkspace';
import { calendarAttendance, linkedCoverage, projectCoverageCalendar } from '../coverage/calendar-connection';
import { applyCoverage } from '../coverage/domain';
import type { Command } from '../coverage/domain';
import CalendarAttendance from '../coverage/CalendarAttendance';
import styles from './calendar.module.css';
import { medicationCalendarState } from '../../server/domain/care/calendarProjection';

const active = (task: Task) => !['completed', 'declined_by_recipient', 'skipped', 'canceled'].includes(task.status);
export default function CalendarDemo({ embedded = false }: { embedded?: boolean }) {
  const { care, calendar, setCalendar, store, setStore, actor, setActor, now, setNow, selected: selectedCoverage, setSelected: selectCoverage } = useCoverageWorkspace();
  const state = projectCoverageCalendar(medicationCalendarState(care), store, actor, now);
  const [recipient, setCalendarRecipient] = useState('all');
  const setRecipient = (id: string) => { setCalendarRecipient(id); const person = DEMO_RECIPIENTS.find(p => p.id === id); if (person) selectCoverage(person.key); };
  const [filterKind, setFilterKind] = useState('all'), [filterCoverage, setFilterCoverage] = useState('all');
  const [mode, setMode] = useState<CalendarMode>('month'), [listView, setListView] = useState(false);
  const [selected, setSelected] = useState(parts(store.coverages.find(c => c.id === selectedCoverage)?.start || now, 'America/Los_Angeles').slice(0, 10));
  const selectedStart = store.coverages.find(c => c.id === selectedCoverage)!.start;
  useEffect(() => { setSelected(parts(selectedStart, 'America/Los_Angeles').slice(0, 10)); }, [selectedCoverage, selectedStart]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [action, setAction] = useState<'create' | 'edit' | 'assign' | 'outcome' | 'cancel' | null>(null);
  const [targetTaskId, setTargetTaskId] = useState(''), [draftPriority, setDraftPriority] = useState(0), [draftHelper, setDraftHelper] = useState('ben');
  const [addHour, setAddHour] = useState<number | undefined>(), [followUp, setFollowUp] = useState<string | undefined>();
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const view = projectView(state, actor, now);
  const canManage = (recipientId: string, taskId?: string) => { try { authorize(calendar, actor, recipientId, 'manage', now, taskId); return true; } catch { return false; } };
  const managed = view.recipients.filter(r => canManage(r.id));
  const canAdd = recipient === 'all' ? managed.length > 0 : managed.some(r => r.id === recipient);
  const displayZone = view.recipients.find(r => r.id === recipient)?.timezone || 'America/Los_Angeles';
  const today = parts(now, displayZone).slice(0, 10);
  const name = (id: string) => view.recipients.find(r => r.id === id)?.name || 'Loved one';
  const recipientTheme = (id: string) => DEMO_RECIPIENTS.find(person => person.id === id) || DEMO_RECIPIENTS[0];
  const eventStyle = (id: string) => { const person = recipientTheme(id); return { '--event-line': person.color, '--event-bg': person.tint, '--event-ink': person.color } as CSSProperties; };
  const helperName = (id: string) => view.helpers.find(h => h.id === id)?.name || 'Caregiver';
  const allEntries: CalendarEntry[] = [
    ...view.visits.map(v => ({ ...v, kind: v.followUpOf ? 'followup' as const : v.kind, visitId: v.id })),
    ...view.tasks.filter(t => !t.visitId || !view.visits.some(v => v.id === t.visitId)).map(t => ({ ...t, kind: 'task' as const, taskId: t.id, canceled: t.status === 'canceled' })),
  ];
  const linkedTasks = (entry: CalendarEntry) => entry.taskId ? view.tasks.filter(t => t.id === entry.taskId) : view.tasks.filter(t => t.visitId === entry.visitId);
  function coverageLabel(entry: CalendarEntry) {
    const linked = linkedCoverage(store, entry);
    if (linked) return calendarAttendance(linked, now);
    if (entry.canceled) return 'Canceled';
    if (view.tasks.find(t => t.id === entry.taskId)?.category === 'medication') return 'Medication schedule';
    const tasks = linkedTasks(entry), open = tasks.filter(active);
    if (tasks.length && !open.length) return 'Care resolved';
    if (open.length && open.every(t => coverage(state, t) === 'accepted')) return 'Covered';
    if (open.some(t => coverage(state, t) === 'pending')) return 'Waiting for response';
    return 'Needs a caregiver';
  }
  function coverageFilterLabel(entry: CalendarEntry) {
    const c = linkedCoverage(store, entry);
    if (!c) return coverageLabel(entry);
    if (c.state === 'canceled') return 'Canceled';
    if (c.taskIds.every(id => c.tasks.some(t => t.id === id && ['completed', 'declined_by_recipient'].includes(t.outcome || '')))) return 'Care resolved';
    if (Date.parse(now) >= Date.parse(c.end) || c.state === 'closed') return 'Needs a caregiver';
    if (c.state === 'confirmed' || c.originalAvailable) return 'Covered';
    return c.invitation === 'pending' && Date.parse(now) < Date.parse(c.respondBy) ? 'Waiting for response' : 'Needs a caregiver';
  }
  const entries = allEntries.filter(e => (recipient === 'all' || e.recipientId === recipient) && (filterKind === 'all' || e.kind === filterKind) && (filterCoverage === 'all' || coverageFilterLabel(e) === filterCoverage));
  const entry = allEntries.find(e => e.id === selectedEntryId);
  const coverageEntry = entry ? linkedCoverage(store, entry) : undefined;
  function runCoverage(command: Command) {
    if (!coverageEntry) return;
    try {
      setStore(applyCoverage(store, { coverageId: coverageEntry.id, expectedVersion: coverageEntry.version, operationId: crypto.randomUUID(), command }, actor, now));
      setError(''); setMessage('Saved in the shared demo. The handoff and calendar now show the same update.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not record the update.'); }
  }
  const task = view.tasks.find(t => t.id === (action === 'assign' || action === 'outcome' ? targetTaskId : entry?.taskId));
  const visit = view.visits.find(v => v.id === entry?.visitId);
  const assignedTasks = entry ? linkedTasks(entry) : [];
  const editorRecipients = followUp ? managed.filter(r => r.id === view.visits.find(v => v.id === followUp)?.recipientId) : entry ? managed.filter(r => r.id === entry.recipientId) : recipient === 'all' ? managed : managed.filter(r => r.id === recipient);
  function clearMessages() { setError(''); setMessage(''); }
  function pickDate(day: string, openDay = false) { setSelected(day); if (openDay) { setMode('day'); setListView(false); } }
  function add(day = selected, hour?: number) { clearMessages(); setSelected(day); setSelectedEntryId(null); setAddHour(hour); setFollowUp(undefined); setAction('create'); }
  function openEntry(item: CalendarEntry) { clearMessages(); setFollowUp(undefined); setSelectedEntryId(item.id); setAction(null); const linked = linkedCoverage(store, item); if (linked) selectCoverage(linked.id); }
  function closeDialog() { setError(''); if (action) setAction(null); else setSelectedEntryId(null); }
  function transact(work: (initial: CoordinationState, execute: (state: CoordinationState, command: CoordinationCommand) => { state: CoordinationState; resultId: string }) => { state: CoordinationState; resultId?: string }, after?: (id?: string) => void) {
    try {
      const execute = (s: CoordinationState, command: CoordinationCommand) => applyCommand(s, command, { actorId: actor, now, idempotencyKey: crypto.randomUUID(), newId: () => crypto.randomUUID() });
      const result = work(calendar, execute);
      setCalendar(result.state); setError(''); setMessage('Saved in this demo. No real notifications were sent.'); setAction(null); setFollowUp(undefined); after?.(result.resultId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Nothing was changed.'); }
  }
  function run(command: CoordinationCommand) { transact((s, execute) => execute(s, command)); }
  function saveEditor(data: FormData, recipientId: string, allDay: boolean) {
    const str = (key: string) => String(data.get(key) || '');
    try {
      const zone = view.recipients.find(r => r.id === recipientId)?.timezone || displayZone;
      const start = localToInstant(`${str('startDate')}T${allDay ? '00:00' : str('startTime')}`, zone);
      const end = localToInstant(`${allDay ? shiftDay(str('endDate'), 1) : str('endDate')}T${allDay ? '00:00' : str('endTime')}`, zone);
      const type = str('type'), title = str('title'), primary = str('primary'), secondary = str('secondary');
      if (primary && primary === secondary) throw new Error('Choose different primary and secondary caregivers.');
      transact((initial, execute) => {
        let s = initial, resultId = '', taskIds: string[] = [];
        if (action === 'edit' && entry) return entry.taskId ? execute(s, { type: 'editTask', taskId: entry.taskId, expectedVersion: task!.version, title, start, end, scope: str('scope') === 'future' ? 'future' : 'one', allDay, instructionVersion: str('instructionVersion') ? Number(str('instructionVersion')) : undefined }) : execute(s, { type: 'editVisit', id: visit!.id, expectedVersion: visit!.version, rescheduleLinkedTasks: str('rescheduleCare') === 'on', input: { recipientId, title, start, end, timezone: zone, allDay, kind: type === 'visit' ? 'visit' : 'appointment', followUpOf: type === 'followup' ? str('followUpOf') : undefined, location: str('location'), provider: str('provider'), notes: str('notes') } });
        if (type !== 'task') {
          const result = execute(s, { type: 'createVisit', input: { recipientId, title, start, end, timezone: zone, allDay, kind: type === 'visit' ? 'visit' : 'appointment', followUpOf: type === 'followup' ? str('followUpOf') : undefined, location: str('location'), provider: str('provider'), notes: str('notes') } });
          s = result.state; resultId = result.resultId;
          const care = execute(s, { type: 'createTask', input: { recipientId, title: `Care for ${title}`, category: type === 'visit' ? 'daily_care' : 'transport', start, end, timezone: zone, allDay, visitId: resultId } });
          s = care.state; taskIds = [care.resultId];
        } else {
          const before = new Set(s.tasks.map(t => t.id));
          const result = execute(s, { type: 'createTask', input: { recipientId, title, category: str('category'), start, end, timezone: zone, allDay, visitId: str('visitId') || undefined, instructionId: str('instructionId') || undefined, recurrence: str('frequency') === 'none' ? undefined : { frequency: str('frequency') as 'daily' | 'weekly', count: Number(str('count')) } } });
          s = result.state; resultId = str('visitId') || result.resultId; taskIds = s.tasks.filter(t => !before.has(t.id)).map(t => t.id);
        }
        for (const id of taskIds) for (const [priority, helperId] of [[0, primary], [1, secondary]] as const) if (helperId) s = execute(s, { type: 'requestAssignment', taskId: id, helperId, priority, expectedVersion: s.tasks.find(t => t.id === id)!.version }).state;
        return { state: s, resultId };
      }, id => setSelectedEntryId(id || null));
    } catch (e) { setError(e instanceof Error ? e.message : 'Please check the dates and times.'); }
  }
  function chooseRole(t: Task, priority: number) { clearMessages(); setTargetTaskId(t.id); setDraftPriority(priority); setDraftHelper(view.helpers.find(h => h.id === 'ben')?.id || view.helpers[0]?.id || ''); setAction('assign'); }
  const showDialog = !!entry || action === 'create';
  const title = action === 'create' ? 'Add an event' : action === 'edit' ? 'Edit event' : action === 'assign' ? roleLabel(draftPriority) : action === 'outcome' ? 'Record what happened' : action === 'cancel' ? 'Cancel this event?' : entry?.title || '';
  const scheduleDays = listView && mode === 'week' ? weekDays(selected) : [selected];
  return <main className={styles.shell}>
    {!embedded && <header className={styles.appHeader}><Link className={styles.wordmark} href="/">Hands<span>In</span><i aria-hidden="true">✳</i></Link><span className={styles.headerDivider} /><span className={styles.pageName}>Calendar</span><Link href="/coverage/demo">Coverage & handoffs →</Link><div className={styles.headerRight}><span className={styles.demoLabel}>Fictional demo · changes reset on reload</span><span className={styles.avatar} aria-label={`Viewing as ${helperName(actor)}`}>{helperName(actor).split(' ').map(w => w[0]).slice(0, 2).join('')}</span></div></header>}
    <div className={styles.workspace}>
      <div className={styles.pageIntro}><div><p className={styles.eyebrow}>Care, together.</p><h1>Your family calendar</h1><p>Appointments, helping hands, and a little peace of mind.</p></div><button className={styles.primary} disabled={!canAdd} onClick={() => add()}>+ Add event</button></div>
      <div className={styles.calendarToolbar}><div className={styles.dateNavigation}><button type="button" onClick={() => setSelected(today)}>Today</button><button type="button" aria-label={`Previous ${mode}`} onClick={() => setSelected(movePeriod(selected, mode, -1))}>‹</button><button type="button" aria-label={`Next ${mode}`} onClick={() => setSelected(movePeriod(selected, mode, 1))}>›</button><h2 aria-live="polite">{calendarTitle(selected, mode)}</h2></div><div className={styles.viewSwitcher} role="group" aria-label="Calendar view">{(['day', 'week', 'month', 'year'] as CalendarMode[]).map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setListView(false); }}>{m[0].toUpperCase() + m.slice(1)}</button>)}</div></div>
      <div className={styles.contextBar}><label className={styles.recipientSelect}>Show<select aria-label="Calendar people" value={recipient} onChange={e => { setRecipient(e.target.value); setSelectedEntryId(null); setAction(null); }}><option value="all">Everyone · combined calendar</option>{view.recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><div className={styles.patientKey} aria-label="Patient color key">{DEMO_RECIPIENTS.filter(person => view.recipients.some(r => r.id === person.id)).map(person => <button type="button" key={person.id} aria-pressed={recipient === person.id} onClick={() => setRecipient(person.id)} style={{ '--patient-color': person.color, '--patient-tint': person.tint } as CSSProperties}><span aria-hidden="true" />{person.preferredName}</button>)}{recipient !== 'all' && <button type="button" className={styles.showEveryone} onClick={() => setRecipient('all')}>Show everyone</button>}</div><span className={styles.timezone}>{displayZone.replaceAll('_', ' ')}</span><details className={styles.filterMenu}><summary>Filters</summary><div className={styles.filterFields}><label className={styles.field}>Event type<select value={filterKind} onChange={e => setFilterKind(e.target.value)}><option value="all">All types</option><option value="appointment">Appointments</option><option value="followup">Follow-ups</option><option value="visit">Care visits</option><option value="task">Care tasks</option></select></label><label className={styles.field}>Coverage<select value={filterCoverage} onChange={e => setFilterCoverage(e.target.value)}>{['all', 'Covered', 'Waiting for response', 'Needs a caregiver', 'Care resolved', 'Canceled'].map(s => <option key={s} value={s}>{s === 'all' ? 'All coverage' : s}</option>)}</select></label><button onClick={() => { setFilterKind('all'); setFilterCoverage('all'); }}>Clear filters</button></div></details>{(mode === 'day' || mode === 'week') && <button className={styles.textButton} aria-pressed={listView} onClick={() => setListView(!listView)}>{listView ? 'Show time grid' : 'Show simple list'}</button>}</div>
      {message && !showDialog && <p role="status" className={styles.message}>{message}</p>}{error && !showDialog && <p role="alert" className={styles.error}>{error}</p>}
      {!view.recipients.length ? <div className={styles.empty}>No recipient access for this demo persona.</div> : <>
        {!listView && <CalendarViews mode={mode} selected={selected} today={today} timezone={displayZone} entries={entries} onDate={pickDate} onMonth={day => { setSelected(day); setMode('month'); setListView(false); }} onEvent={openEntry} onAdd={add} recipientName={name} recipientStyle={eventStyle} coverageLabel={coverageLabel} canAdd={canAdd} />}
        <section id="calendar-day-schedule" className={styles.daySchedule} aria-label="Selected day schedule">{scheduleDays.map(day => <div key={day}><div className={styles.scheduleHeading}><div><span className={styles.eyebrow}>{listView && mode === 'week' ? 'Week schedule' : recipient === 'all' ? 'Everyone’s selected day' : 'Selected day'}</span><h2>{formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}</h2></div><button disabled={!canAdd} onClick={() => add(day)}>+ Add to this day</button></div>{entriesOnDay(entries, day, displayZone).length ? entriesOnDay(entries, day, displayZone).map(item => <button key={item.id} style={eventStyle(item.recipientId)} className={`${styles.scheduleItem} ${item.canceled ? styles.canceledEvent : ''}`} onClick={() => openEntry(item)}><span className={`${styles.eventMarker} ${styles[item.kind]}`} aria-hidden="true" /><span className={styles.scheduleTime}>{timeRange(item, displayZone)}</span><span className={styles.scheduleName}><strong>{item.title}</strong><small><i className={styles.patientDot} aria-hidden="true" />{name(item.recipientId)} · {kindLabel(item)}</small></span><span className={`${styles.coverageBadge} ${coverageFilterLabel(item) === 'Covered' ? styles.covered : ''}`}>{coverageLabel(item)}</span><span aria-hidden="true">›</span></button>) : <div className={styles.empty}>Nothing scheduled for this day.{canAdd && ' Select “Add to this day” to make a plan.'}</div>}</div>)}</section>
      </>}
      <footer className={styles.calendarFooter}><div className={styles.legend}>{(['appointment', 'followup', 'visit', 'task'] as const).map(kind => <span key={kind}><i className={`${styles.legendDot} ${styles[kind]}`} />{{ appointment: 'Appointment', followup: 'Follow-up', visit: 'Care visit', task: 'Care task' }[kind]}</span>)}</div><details className={styles.demoTools}><summary>Demo tools</summary><label className={styles.field}>Demo persona (not sign-in)<select value={actor} onChange={e => { setActor(e.target.value); setRecipient('all'); setSelectedEntryId(null); setAction(null); clearMessages(); }}>{state.helpers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><p>Shared demo session with Coverage. No cross-device saving, phone alerts or real access grants. Reload resets both screens.</p><p>Demo time: {parts(now, displayZone).replace('T', ' ')} · {displayZone}</p><button onClick={() => { const c = store.coverages.find(c => c.id === selectedCoverage)!; setNow(c.start); setSelected(parts(c.start, displayZone).slice(0, 10)); }}>Start selected coverage visit</button></details></footer>
    </div>
    {showDialog && <CalendarDialog title={title} close={closeDialog}>
      {message && <p role="status" className={styles.message}>{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      {action === 'create' || action === 'edit' ? <EventEditor key={`${action}-${selectedEntryId || selected}-${followUp || ''}`} entry={action === 'edit' ? entry : undefined} task={task} visit={action === 'edit' ? visit : undefined} hasLinkedCare={assignedTasks.some(active)} date={selected} hour={addHour} defaultFollowUp={followUp} recipients={editorRecipients} helpers={view.helpers} instructions={view.instructions} visits={view.visits} onSave={saveEditor} onBack={closeDialog} /> : action === 'assign' && task ? <form className={styles.form} onSubmit={e => { e.preventDefault(); run({ type: 'requestAssignment', taskId: task.id, helperId: draftHelper, priority: draftPriority, expectedVersion: task.version }); }}><p className={styles.full}>{name(task.recipientId)} · {task.title}</p><label className={`${styles.field} ${styles.full}`}>Choose caregiver<select value={draftHelper} onChange={e => setDraftHelper(e.target.value)}>{view.helpers.filter(h => h.id !== 'unrelated' && h.id !== 'guest').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><div className={styles.full}>{assignmentConflicts(state, actor, task, draftHelper, now).map((c, i) => <p className={styles.message} key={i}>{c.message}</p>)}<p>{draftPriority === 0 ? 'Current accepted coverage remains until this caregiver accepts.' : 'This is a backup role. It does not count as primary coverage.'}</p></div><div className={`${styles.formActions} ${styles.full}`}><button type="button" onClick={closeDialog}>Back</button><button type="submit" className={styles.primary}>Send request</button></div></form> : action === 'outcome' && task ? <form className={styles.form} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); run({ type: 'outcome', taskId: task.id, expectedVersion: task.version, status: String(data.get('outcome')) as 'completed', detail: String(data.get('detail') || '') }); }}><p className={styles.full}>{name(task.recipientId)} · {task.title}</p><label className={`${styles.field} ${styles.full}`}>What happened?<select name="outcome"><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="unable_to_complete">Unable to complete — needs help</option><option value="declined_by_recipient">Loved one declined</option></select></label><label className={`${styles.field} ${styles.full}`}>Note<textarea name="detail" required maxLength={1000} /></label><div className={`${styles.formActions} ${styles.full}`}><button type="button" onClick={closeDialog}>Back</button><button className={styles.primary}>Save outcome</button></div></form> : action === 'cancel' && entry ? <form onSubmit={e => { e.preventDefault(); const scope = new FormData(e.currentTarget).get('scope'); run(entry.taskId ? { type: 'cancelTask', taskId: entry.taskId, expectedVersion: task!.version, scope: scope === 'future' ? 'future' : 'one' } : { type: 'cancelVisit', id: visit!.id, expectedVersion: visit!.version }); }}><p>{entry.title} · {name(entry.recipientId)}</p><p>Unresolved linked work and caregiver requests will be canceled. Completed history will be kept.</p>{task?.seriesId && <label className={styles.field}>Cancel<select name="scope"><option value="one">This occurrence</option><option value="future">This and future unresolved occurrences</option></select></label>}<div className={styles.formActions}><button type="button" onClick={closeDialog}>Keep event</button><button className={styles.danger} type="submit">Confirm cancellation</button></div></form> : entry && <>
        <div className={styles.detailMeta}><span className={`${styles.kindPill} ${styles[entry.kind]}`}>{kindLabel(entry)}</span><span className={`${styles.coverageBadge} ${coverageFilterLabel(entry) === 'Covered' ? styles.covered : ''}`}>{coverageLabel(entry)}</span></div>
        <dl className={styles.eventFacts}><div><dt>Loved one</dt><dd>{name(entry.recipientId)}</dd></div><div><dt>When</dt><dd>{formatDay(parts(entry.start, entry.timezone).slice(0, 10))}<br />{timeRange(entry, entry.timezone)}<small>{entry.timezone.replaceAll('_', ' ')}</small></dd></div>{visit?.location && <div><dt>Where</dt><dd>{visit.location}</dd></div>}{visit?.provider && <div><dt>Contact</dt><dd>{visit.provider}</dd></div>}{visit?.notes && <div><dt>Notes</dt><dd>{visit.notes}</dd></div>}{visit?.followUpOf && <div><dt>Follow-up to</dt><dd>{view.visits.find(v => v.id === visit.followUpOf)?.title || 'Earlier appointment'}</dd></div>}</dl>
        {coverageEntry ? <CalendarAttendance coverage={coverageEntry} actor={actor} now={now} act={runCoverage} openHandoff={() => selectCoverage(coverageEntry.id)} /> : task?.category === 'medication' ? <p>Medication-owned schedule. <Link href="/medications/demo">Review medication →</Link></p> : task?.recordingPolicy === 'shared_care' ? <p><Link href={`/care/demo?task=${encodeURIComponent(task.id)}`}>Review and record in meals & daily care →</Link></p> : assignedTasks.length ? <CaregiverPanel tasks={assignedTasks} view={view} actor={actor} canManage={t => canManage(t.recipientId, t.id)} onAssign={chooseRole} onOutcome={t => { setTargetTaskId(t.id); setAction('outcome'); }} onCoverage={() => setMessage('Temporary helper access is not connected. A coordinator can request a replacement from existing caregivers.')} run={run} /> : !entry.canceled && canManage(entry.recipientId) && <button className={styles.primary} onClick={() => transact((s, execute) => execute(s, { type: 'createTask', input: { recipientId: entry.recipientId, title: `Care for ${entry.title}`, category: 'transport', start: entry.start, end: entry.end, timezone: entry.timezone, visitId: entry.visitId, allDay: entry.allDay } }))}>Add caregiver responsibilities</button>}
        {!coverageEntry && task?.category !== 'medication' && task?.recordingPolicy !== 'shared_care' && canManage(entry.recipientId, entry.taskId) && !entry.canceled && <div className={styles.formActions}><button onClick={() => { setError(''); setAction('edit'); }}>Edit event</button>{visit && <button onClick={() => { clearMessages(); setFollowUp(visit.id); setSelected(shiftDay(parts(visit.start, visit.timezone).slice(0, 10), 7)); setSelectedEntryId(null); setAction('create'); }}>+ Follow-up</button>}<button className={styles.textDanger} onClick={() => { setError(''); setAction('cancel'); }}>Cancel event</button></div>}
      </>}
    </CalendarDialog>}
  </main>;
}



