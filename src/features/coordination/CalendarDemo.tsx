'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CoordinationCommand, Task, Visit } from '../../contracts/coordination';
import { applyCommand, assignmentConflicts, authorize, coverage, projectView } from '../../server/domain/coordination/service';
import { localToInstant, parts } from '../../server/domain/coordination/time';
import { makeFixtures } from './demo/fixtures';
import styles from './calendar.module.css';

type Modal = { kind: 'task' } | { kind: 'visit' } | { kind: 'editTask' | 'assign' | 'outcome' | 'cancelTask'; task: Task } | { kind: 'editVisit' | 'cancelVisit'; visit: Visit };
const labels: Record<string, string> = { open: 'Open', in_progress: 'In progress', completed: 'Completed', unable_to_complete: 'Needs help', declined_by_recipient: 'Declined by recipient', canceled: 'Canceled', pending: 'Awaiting acceptance', accepted: 'Accepted coverage', uncovered: 'Uncovered', closed: 'Closed', transport: 'Transport', daily_care: 'Daily care', companionship: 'Companionship', medication: 'Medication' };
const dateLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
function shiftDay(day: string, amount: number) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); }
function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className={styles.overlay}><div className={styles.dialog} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}><div className={styles.toolbar}><h2 id={id}>{title}</h2><button type="button" onClick={close} aria-label="Close dialog">✕</button></div>{children}</div></div>;
}

export default function CalendarDemo({ initialNow }: { initialNow: string }) {
  const [state, setState] = useState(() => makeFixtures(initialNow));
  const [now, setNow] = useState(initialNow);
  const [actor, setActor] = useState('sarah');
  const [recipient, setRecipient] = useState('all');
  const [helper, setHelper] = useState('all');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [day, setDay] = useState(parts(initialNow, 'America/Los_Angeles').slice(0, 10));
  const [modal, setModal] = useState<Modal | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [draftRecipient, setDraftRecipient] = useState('r-alex');
  const [draftHelper, setDraftHelper] = useState('ben');
  useEffect(() => { const timer = setInterval(() => setNow(new Date().toISOString()), 30000); return () => clearInterval(timer); }, []);
  const view = projectView(state, actor, now);
  const canManage = (recipientId: string, taskId?: string) => { try { authorize(state, actor, recipientId, 'manage', now, taskId); return true; } catch { return false; } };
  const managedRecipients = view.recipients.filter(r => canManage(r.id));
  const selectedRecipient = view.recipients.find(r => r.id === draftRecipient) || view.recipients[0];
  const zone = selectedRecipient?.timezone || 'America/Los_Angeles';
  const name = (id: string) => view.recipients.find(r => r.id === id)?.name || 'Authorized recipient';
  const helperName = (id: string) => view.helpers.find(h => h.id === id)?.name || 'Helper';
  const active = (t: Task) => !['completed', 'declined_by_recipient', 'canceled'].includes(t.status);
  const overdue = (t: Task) => active(t) && Date.parse(t.end) < Date.parse(now);
  function open(next: Modal) { setError(''); setMessage(''); setModal(next); if ('task' in next) setDraftRecipient(next.task.recipientId); if ('visit' in next) setDraftRecipient(next.visit.recipientId); }
  function run(command: CoordinationCommand) {
    try {
      const result = applyCommand(state, command, { actorId: actor, now: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), newId: () => crypto.randomUUID() });
      setState(result.state); setError(''); setMessage('Updated in this fictional demo. No real notification was sent.'); setModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Your change was not recorded.'); }
  }
  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const str = (key: string) => String(data.get(key) || '');
    try {
      if (modal?.kind === 'task') {
        run({ type: 'createTask', input: { recipientId: draftRecipient, title: str('title'), category: str('category'), start: localToInstant(str('start'), zone), end: localToInstant(str('end'), zone), timezone: zone, visitId: str('visitId') || undefined, instructionId: str('instructionId') || undefined, recurrence: str('frequency') === 'none' ? undefined : { frequency: str('frequency') as 'daily' | 'weekly', count: Number(str('count')) } } });
      } else if (modal?.kind === 'visit' || modal?.kind === 'editVisit') {
        const input = { recipientId: draftRecipient, title: str('title'), kind: str('kind') as 'visit' | 'appointment', start: localToInstant(str('start'), zone), end: localToInstant(str('end'), zone), timezone: zone, location: str('location'), provider: str('provider'), notes: str('notes') };
        run(modal.kind === 'visit' ? { type: 'createVisit', input } : { type: 'editVisit', id: modal.visit.id, expectedVersion: modal.visit.version, input });
      } else if (modal?.kind === 'editTask') {
        run({ type: 'editTask', taskId: modal.task.id, expectedVersion: modal.task.version, scope: str('scope') as 'one' | 'future', title: str('title'), start: localToInstant(str('start'), modal.task.timezone), end: localToInstant(str('end'), modal.task.timezone), instructionVersion: str('instructionVersion') ? Number(str('instructionVersion')) : undefined });
      } else if (modal?.kind === 'assign') run({ type: 'requestAssignment', taskId: modal.task.id, helperId: draftHelper, expectedVersion: modal.task.version });
      else if (modal?.kind === 'outcome') run({ type: 'outcome', taskId: modal.task.id, expectedVersion: modal.task.version, status: str('outcome') as 'completed', detail: str('detail') });
      else if (modal?.kind === 'cancelTask') run({ type: 'cancelTask', taskId: modal.task.id, expectedVersion: modal.task.version, scope: str('scope') as 'one' | 'future' });
      else if (modal?.kind === 'cancelVisit') run({ type: 'cancelVisit', id: modal.visit.id, expectedVersion: modal.visit.version });
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid form.'); }
  }
  const days = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => shiftDay(day, i));
  const matchesTask = (t: Task) => (recipient === 'all' || t.recipientId === recipient) && (helper === 'all' || view.assignments.some(a => a.taskId === t.id && a.helperId === helper && ['accepted', 'requested'].includes(a.status))) && (status === 'all' || (status === 'overdue' ? overdue(t) : coverage(state, t) === status));
  const tasks = view.tasks.filter(matchesTask);
  const visits = view.visits.filter(v => (recipient === 'all' || v.recipientId === recipient) && (helper === 'all' || tasks.some(t => t.visitId === v.id)) && (status === 'all' || tasks.some(t => t.visitId === v.id)));
  const inDay = (item: Task | Visit, date: string) => parts(item.start, item.timezone).slice(0, 10) <= date && parts(new Date(Date.parse(item.end) - 1).toISOString(), item.timezone).slice(0, 10) >= date;
  const timeLabel = (item: Task | Visit) => {
    const start = parts(item.start, item.timezone), end = parts(item.end, item.timezone);
    return start.slice(0, 10) === end.slice(0, 10) ? `${start.slice(11)}–${end.slice(11)}` : `${start.replace('T', ' ')} → ${end.replace('T', ' ')}`;
  };
  function taskCard(t: Task) {
    const pending = view.assignments.find(a => a.taskId === t.id && a.status === 'requested');
    const accepted = view.assignments.find(a => a.taskId === t.id && a.status === 'accepted');
    const instruction = view.instructions.find(i => i.id === t.instructionId && i.current);
    return <article className={styles.card} key={t.id}>
      <div className={styles.meta}>{name(t.recipientId)} · {labels[t.category] || t.category}</div>
      <h3>{t.title}</h3><p className={styles.meta}>{timeLabel(t)} · {t.timezone}</p>
      <div className={styles.badges}><span className={`${styles.badge} ${coverage(state, t) === 'accepted' ? '' : styles.warning}`}>{labels[coverage(state, t)]}</span><span className={`${styles.badge} ${styles.neutral}`}>{labels[t.status]}</span>{overdue(t) && <span className={`${styles.badge} ${styles.warning}`}>Overdue · unresolved</span>}</div>
      {accepted && <p>Responsible: <strong>{helperName(accepted.helperId)}</strong></p>}
      {pending && <p>Requested: {helperName(pending.helperId)} · awaiting response{accepted ? '; current helper retains coverage.' : '.'}</p>}
      {instruction && <p>Instructions v{instruction.version}: {instruction.text}</p>}
      {t.visitId && <p className={styles.meta}>Linked to: {view.visits.find(v => v.id === t.visitId)?.title || 'Authorized visit'}</p>}
      <div className={styles.actions}>
        {pending?.helperId === actor && <><button className={styles.primary} onClick={() => run({ type: 'respondAssignment', id: pending.id, expectedVersion: pending.version, response: 'accepted' })}>Accept</button><button onClick={() => run({ type: 'respondAssignment', id: pending.id, expectedVersion: pending.version, response: 'declined' })}>Decline</button></>}
        {canManage(t.recipientId, t.id) && active(t) && <><button onClick={() => open({ kind: 'assign', task: t })}>{accepted ? 'Request replacement' : 'Assign helper'}</button><button onClick={() => open({ kind: 'editTask', task: t })}>Edit task</button><button onClick={() => open({ kind: 'cancelTask', task: t })}>Cancel task</button>{pending && <button onClick={() => run({ type: 'cancelAssignment', id: pending.id, expectedVersion: pending.version })}>Withdraw request</button>}</>}
        {accepted?.helperId === actor && active(t) && <><button className={styles.primary} onClick={() => open({ kind: 'outcome', task: t })} disabled={!!t.medicationOccurrenceId || t.category === 'medication'}>Record outcome</button><button onClick={() => setMessage('Temporary coverage is not connected yet. No guest access or replacement request has been created.')}>Request cover</button></>}
      </div>
      {state.audit.some(e => e.taskId === t.id) && <details className={styles.history}><summary>Task history</summary><ul>{view.audit.filter(e => e.taskId === t.id).map(e => <li key={e.id}>{parts(e.at, t.timezone)} · {helperName(e.actorId)} · {e.action}: {e.detail}</li>)}</ul></details>}
    </article>;
  }
  function visitCard(v: Visit) {
    const allLinked = view.tasks.filter(t => t.visitId === v.id);
    const linked = allLinked.filter(active);
    const covered = linked.length > 0 && linked.every(t => coverage(state, t) === 'accepted');
    const resolved = allLinked.length > 0 && linked.length === 0;
    return <article className={styles.card} key={v.id}><div className={styles.meta}>{name(v.recipientId)} · {v.kind === 'appointment' ? 'Appointment' : 'Care visit'}</div><h3>{v.title}</h3><p className={styles.meta}>{timeLabel(v)} · {v.timezone}</p><span className={`${styles.badge} ${covered || resolved ? '' : styles.warning}`}>{v.canceled ? 'Canceled' : resolved ? 'Linked tasks resolved' : covered ? 'Linked tasks covered' : 'Coverage needs review'}</span><p>{v.location}{v.provider && ` · ${v.provider}`}</p>{v.notes && <p>{v.notes}</p>}{canManage(v.recipientId) && !v.canceled && <div className={styles.actions}><button onClick={() => open({ kind: 'editVisit', visit: v })}>Edit visit</button><button onClick={() => open({ kind: 'cancelVisit', visit: v })}>Cancel visit</button></div>}</article>;
  }
  const existingTask = modal && 'task' in modal ? modal.task : undefined;
  const existingVisit = modal && 'visit' in modal ? modal.visit : undefined;
  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/" className="wordmark">Hands<span>In</span></Link><Link href="/calendar">Calendar & delegation ↗</Link></header>
    <div className={styles.notice}><strong>Fictional demo · not a connected care account</strong><p>Use fictional information only. Changes reset on reload and are not shared. Demo personas are not real sign-ins; no phone alerts or temporary access are created.</p></div>
    <section className={styles.intro}><p className={styles.eyebrow}>A plan everyone can count on.</p><h1>Someone’s got today.</h1><p>See what’s coming up, who’s helping, and where a little backup is needed.</p></section>
    <div className={styles.toolbar}><label className={styles.field}>Demo persona (not sign-in)<select value={actor} onChange={e => { setActor(e.target.value); setRecipient('all'); setHelper('all'); setModal(null); setError(''); setMessage(''); }}>{state.helpers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><div className={styles.actions}><button onClick={() => open({ kind: 'visit' })} disabled={!managedRecipients.length}>+ Appointment / visit</button><button className={styles.primary} onClick={() => open({ kind: 'task' })} disabled={!managedRecipients.length}>+ Care task</button></div></div>
    <div className={styles.stats}><div className={styles.stat}><strong>{view.tasks.filter(t => coverage(state, t) === 'accepted').length}</strong><span>Accepted tasks</span></div><div className={styles.stat}><strong>{view.tasks.filter(t => coverage(state, t) === 'pending').length}</strong><span>Awaiting acceptance</span></div><div className={styles.stat}><strong>{view.tasks.filter(t => coverage(state, t) === 'uncovered').length}</strong><span>Need a helper</span></div></div>
    <div className={styles.filters}>
      <label className={styles.field}>Loved one<select value={recipient} onChange={e => setRecipient(e.target.value)}><option value="all">All authorized recipients</option>{view.recipients.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>
      <label className={styles.field}>Helper<select value={helper} onChange={e => setHelper(e.target.value)}><option value="all">All helpers</option>{view.helpers.map(h => <option value={h.id} key={h.id}>{h.name}</option>)}</select></label>
      <label className={styles.field}>Item type<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">All items</option><option value="tasks">Care tasks</option><option value="visits">Appointments & visits</option></select></label>
      <label className={styles.field}>Coverage<select value={status} onChange={e => setStatus(e.target.value)}>{['all', 'accepted', 'pending', 'uncovered', 'overdue', 'closed'].map(s => <option key={s} value={s}>{labels[s] || (s === 'all' ? 'All statuses' : 'Overdue')}</option>)}</select></label>
    </div>
    <div className={styles.toolbar}><div className={styles.row}><button aria-label="Previous period" onClick={() => setDay(shiftDay(day, mode === 'week' ? -7 : -1))}>←</button><button onClick={() => setDay(parts(now, 'America/Los_Angeles').slice(0, 10))}>Today</button><button aria-label="Next period" onClick={() => setDay(shiftDay(day, mode === 'week' ? 7 : 1))}>→</button><label className={styles.field}>Starting date<input type="date" value={day} required onChange={e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDay(e.target.value); }} /></label></div><div className={styles.row}><button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>Day agenda</button><button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>7-day view</button></div></div>
    {message && <p role="status" className={styles.message}>{message}</p>}{error && !modal && <p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}
    <div className={mode === 'day' ? styles.grid : undefined}><section aria-label="Calendar items" className={mode === 'week' ? styles.week : styles.agenda}>{days.map(date => {
      const items: (Task | Visit)[] = [...(kind === 'visits' ? [] : tasks.filter(t => inDay(t, date))), ...(kind === 'tasks' ? [] : visits.filter(v => inDay(v, date)))].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      return <div key={date} className={styles.weekColumn}><h2 className={styles.dayTitle}>{dateLabel(date)}</h2>{items.length ? items.map(item => 'category' in item ? taskCard(item) : visitCard(item)) : <div className={styles.empty}>{view.recipients.length ? 'No items match this day and your filters.' : 'No recipient access for this demo persona.'}</div>}</div>;
    })}</section>{mode === 'day' && <aside className={styles.panel}><h2>Share the load.</h2><p>A request is a conversation. Coverage is confirmed when the helper accepts.</p><ol><li>Create a task as Sarah.</li><li>Request Ben’s help.</li><li>Switch to Ben and accept.</li><li>Record an outcome, then check history.</li></ol><details><summary>What’s connected?</summary><p>This demo exercises the domain rules with synthetic data in memory. Production login, database persistence, temporary coverage, medication outcomes, and SMS are unavailable. The calendar cannot send notifications or grant access.</p></details></aside>}</div>
    {modal && <Dialog title={({ task: 'Create a care task', visit: 'Add appointment or visit', editTask: 'Edit care task', editVisit: 'Edit appointment or visit', assign: 'Request a helper', outcome: 'Record what happened', cancelTask: 'Cancel care task', cancelVisit: 'Cancel appointment or visit' })[modal.kind]} close={() => { setModal(null); setError(''); }}>
      <p>{existingTask ? `${name(existingTask.recipientId)} · ${existingTask.title}` : existingVisit ? `${name(existingVisit.recipientId)} · ${existingVisit.title}` : 'Fictional demo data only.'}</p>
      {error && <p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}
      <form className={styles.form} onSubmit={e => { e.preventDefault(); submit(e.currentTarget); }}>
        {['task', 'visit', 'editVisit'].includes(modal.kind) && <label className={`${styles.field} ${styles.full}`}>Loved one<select value={draftRecipient} disabled={modal.kind === 'editVisit'} onChange={e => setDraftRecipient(e.target.value)}>{managedRecipients.map(r => <option value={r.id} key={r.id}>{r.name}</option>)}</select></label>}
        {['task', 'visit', 'editTask', 'editVisit'].includes(modal.kind) && <>
          <label className={`${styles.field} ${styles.full}`}>Title<input name="title" maxLength={160} required defaultValue={existingTask?.title || existingVisit?.title || ''} /></label>
          <p className={`${styles.full} ${styles.meta}`}>Times are in {existingTask?.timezone || zone}. Repeated or nonexistent daylight-saving times require another time.</p>
          <label className={styles.field}>Start<input key={`start-${draftRecipient}`} name="start" type="datetime-local" required defaultValue={existingTask ? parts(existingTask.start, existingTask.timezone) : existingVisit ? parts(existingVisit.start, zone) : `${day}T09:00`} /></label>
          <label className={styles.field}>End / due by<input key={`end-${draftRecipient}`} name="end" type="datetime-local" required defaultValue={existingTask ? parts(existingTask.end, existingTask.timezone) : existingVisit ? parts(existingVisit.end, zone) : `${day}T10:00`} /></label>
        </>}
        {modal.kind === 'task' && <>
          <label className={styles.field}>Category<select name="category">{['daily_care', 'transport', 'companionship'].map(k => <option value={k} key={k}>{labels[k]}</option>)}</select></label>
          <label className={styles.field}>Repeat<select name="frequency"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
          <label className={styles.field}>Occurrences (if repeating)<input name="count" type="number" min={1} max={30} defaultValue={7} /></label>
          <label className={styles.field}>Linked visit<select name="visitId" key={`visit-${draftRecipient}`}><option value="">None</option>{view.visits.filter(v => v.recipientId === draftRecipient && !v.canceled).map(v => <option value={v.id} key={v.id}>{v.title}</option>)}</select></label>
          <label className={`${styles.field} ${styles.full}`}>Approved instructions<select name="instructionId" key={`instructions-${draftRecipient}`}><option value="">No linked instruction</option>{view.instructions.filter(i => i.recipientId === draftRecipient && i.current).map(i => <option value={i.id} key={i.id}>{i.text}</option>)}</select></label>
        </>}
        {(modal.kind === 'visit' || modal.kind === 'editVisit') && <>
          <label className={styles.field}>Type<select name="kind" defaultValue={existingVisit?.kind || 'appointment'}><option value="appointment">Appointment</option><option value="visit">Care visit / shift</option></select></label>
          <label className={styles.field}>Location<input name="location" maxLength={2000} defaultValue={existingVisit?.location || ''} /></label>
          <label className={`${styles.field} ${styles.full}`}>Provider / contact<input name="provider" maxLength={2000} defaultValue={existingVisit?.provider || ''} /></label>
          <label className={`${styles.field} ${styles.full}`}>Notes / transport instructions<textarea name="notes" maxLength={2000} defaultValue={existingVisit?.notes || ''} /></label>
          <p className={styles.full}>Create and link a transport or care task to request a helper. Saving this entry alone does not confirm coverage.</p>
        </>}
        {modal.kind === 'assign' && <>
          <label className={`${styles.field} ${styles.full}`}>Proposed helper<select value={draftHelper} onChange={e => setDraftHelper(e.target.value)}>{view.helpers.filter(h => ['sarah', 'ben'].includes(h.id)).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
          <div className={styles.full}>{assignmentConflicts(state, actor, modal.task, draftHelper, now).map((c, i) => <p className={styles.notice} key={i}>{c.message}</p>)}<p>The helper must accept. Current accepted coverage stays in place until a replacement accepts.</p></div>
        </>}
        {modal.kind === 'outcome' && <>
          <label className={`${styles.field} ${styles.full}`}>Outcome<select name="outcome"><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="unable_to_complete">Unable to complete — needs help</option><option value="declined_by_recipient">Recipient declined</option></select></label>
          <label className={`${styles.field} ${styles.full}`}>What happened?<textarea name="detail" required maxLength={1000} /></label>
        </>}
        {(modal.kind === 'editTask' || modal.kind === 'cancelTask') && <><label className={`${styles.field} ${styles.full}`}>Apply to<select name="scope"><option value="one">This occurrence</option>{existingTask?.seriesId && <option value="future">This and future unresolved occurrences</option>}</select></label><p className={styles.full}>Completed history is preserved. Editing cancels affected assignments so helpers can review a new request. Future occurrences keep their relative calendar spacing and use the new local start/end times.</p></>}
        {modal.kind === 'editTask' && modal.task.instructionId && <div className={styles.full}>{view.instructions.filter(i => i.id === modal.task.instructionId && i.current).map(i => <label key={i.id}><p>Current instructions v{i.version}: {i.text}</p><input type="checkbox" name="instructionVersion" value={i.version} required /> I reviewed these current instructions.</label>)}</div>}
        {modal.kind === 'cancelVisit' && <p className={styles.full}>This cancels the visit and its unresolved linked tasks, withdraws their assignments, and invalidates their queued reminders. Completed history is preserved.</p>}
        <div className={`${styles.actions} ${styles.full}`}><button type="button" onClick={() => setModal(null)}>Back</button><button className={styles.primary} type="submit">{modal.kind === 'assign' ? 'Send demo request' : modal.kind.startsWith('cancel') ? 'Confirm cancellation' : 'Save demo change'}</button></div>
      </form>
    </Dialog>}
  </main>;
}
