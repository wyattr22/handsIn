'use client';
import { useState } from 'react';
import type { CoordinationState, Task, Visit } from '../../contracts/coordination';
import { parts } from '../../server/domain/coordination/time';
import { formatDay, shiftDay } from './calendarMath';
import type { CalendarEntry } from './calendarMath';
import styles from './calendar.module.css';

export const roleLabel = (priority: number) => priority === 0 ? 'Primary caregiver' : priority === 1 ? 'Secondary caregiver' : `Additional backup ${priority - 1}`;
interface EditorProps {
  entry?: CalendarEntry; task?: Task; visit?: Visit; date: string; hour?: number; defaultFollowUp?: string;
  recipients: CoordinationState['recipients']; helpers: CoordinationState['helpers']; instructions: CoordinationState['instructions']; visits: Visit[];
  onSave: (data: FormData, recipientId: string, allDay: boolean) => void; onBack: () => void;
  hasLinkedCare?: boolean;
}
export default function EventEditor(p: EditorProps) {
  const [recipientId, setRecipientId] = useState(p.entry?.recipientId || p.recipients[0]?.id || '');
  const [type, setType] = useState(p.entry?.kind || (p.defaultFollowUp ? 'followup' : 'appointment'));
  const [allDay, setAllDay] = useState(p.entry?.allDay || false);
  const zone = p.recipients.find(r => r.id === recipientId)?.timezone || 'America/Los_Angeles';
  const start = p.entry ? parts(p.entry.start, zone) : `${p.date}T${String(p.hour ?? 9).padStart(2, '0')}:00`;
  const end = p.entry ? parts(p.entry.end, zone) : `${p.hour === 23 ? shiftDay(p.date, 1) : p.date}T${String(p.hour === 23 ? 0 : (p.hour ?? 9) + 1).padStart(2, '0')}:00`;
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); p.onSave(new FormData(e.currentTarget), recipientId, allDay); }}>
    <label className={styles.field}>Loved one<select value={recipientId} disabled={!!p.entry} onChange={e => setRecipientId(e.target.value)}>{p.recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className={styles.field}>Event type<select name="type" value={type} disabled={!!p.entry} onChange={e => setType(e.target.value as CalendarEntry['kind'])}><option value="appointment">Appointment</option><option value="followup">Follow-up appointment</option><option value="visit">Care visit</option><option value="task">Care task</option></select>{p.entry && <input type="hidden" name="type" value={type} />}</label>
    <label className={`${styles.field} ${styles.full}`}>Title<input name="title" required maxLength={160} placeholder="e.g. Follow-up with Dr. Lee" defaultValue={p.entry?.title || (p.defaultFollowUp ? 'Follow-up appointment' : '')} /></label>
    {type === 'followup' && <label className={`${styles.field} ${styles.full}`}>Follow-up to<select key={recipientId} name="followUpOf" required defaultValue={p.visit?.followUpOf || p.defaultFollowUp || ''}><option value="">Choose the earlier appointment</option>{p.visits.filter(v => v.recipientId === recipientId && !v.canceled && v.id !== p.visit?.id).map(v => <option key={v.id} value={v.id}>{v.title} · {formatDay(parts(v.start, zone).slice(0, 10), { month: 'short', day: 'numeric' })}</option>)}</select></label>}
    <label className={`${styles.checkField} ${styles.full}`}><input type="checkbox" name="allDay" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> All day</label>
    <label className={styles.field}>Start date<input name="startDate" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={start.slice(0, 10)} /></label>
    <label className={styles.field}>End date<input name="endDate" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={p.entry?.allDay ? shiftDay(end.slice(0, 10), -1) : end.slice(0, 10)} /></label>
    {!allDay && <><label className={styles.field}>Start time<input name="startTime" type="time" required defaultValue={start.slice(11)} /></label><label className={styles.field}>End time<input name="endTime" type="time" required defaultValue={end.slice(11)} /></label></>}
    <p className={`${styles.hint} ${styles.full}`}>Times are in {zone.replaceAll('_', ' ')}.{allDay ? ' End date is included.' : ''}</p>
    {type !== 'task' ? <><label className={styles.field}>Location<input name="location" maxLength={2000} defaultValue={p.visit?.location || ''} placeholder="Where to go" /></label><label className={styles.field}>Provider / contact<input name="provider" maxLength={2000} defaultValue={p.visit?.provider || ''} /></label><label className={`${styles.field} ${styles.full}`}>Notes<textarea name="notes" maxLength={2000} defaultValue={p.visit?.notes || ''} placeholder="Anything the caregiver needs to know" /></label></> : <>
      {!p.entry && <><label className={styles.field}>Care category<select name="category"><option value="daily_care">Daily care</option><option value="transport">Transport</option><option value="companionship">Companionship</option></select></label><label className={styles.field}>Repeat<select name="frequency"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><label className={styles.field}>Number of occurrences<input name="count" type="number" min={1} max={30} defaultValue={7} /></label><label className={styles.field}>Link to appointment (optional)<select key={recipientId} name="visitId"><option value="">None</option>{p.visits.filter(v => v.recipientId === recipientId && !v.canceled).map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label><label className={`${styles.field} ${styles.full}`}>Care instructions<select key={`instruction-${recipientId}`} name="instructionId"><option value="">No linked instructions</option>{p.instructions.filter(i => i.recipientId === recipientId && i.current).map(i => <option key={i.id} value={i.id}>{i.text}</option>)}</select></label></>}
      {p.task?.seriesId && <label className={`${styles.field} ${styles.full}`}>Apply changes to<select name="scope"><option value="one">This occurrence</option><option value="future">This and future unresolved occurrences</option></select></label>}
      {p.task?.instructionId && p.instructions.filter(i => i.id === p.task?.instructionId && i.current).map(i => <label key={i.id} className={`${styles.checkField} ${styles.full}`}><input type="checkbox" name="instructionVersion" value={i.version} required /><span>I reviewed the current instructions: {i.text}</span></label>)}
    </>}
    {!p.entry && <fieldset className={`${styles.caregiverFields} ${styles.full}`}><legend>Who can help?</legend><p className={styles.hint}>Optional. Each caregiver will need to accept.</p><div className={styles.form}>{[0, 1].map(priority => <label className={styles.field} key={priority}>{roleLabel(priority)}<select name={priority === 0 ? 'primary' : 'secondary'} defaultValue=""><option value="">Choose later</option>{p.helpers.filter(h => h.id !== 'unrelated' && h.id !== 'guest').map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>)}</div></fieldset>}
    {p.entry && <p className={`${styles.hint} ${styles.full}`}>Changed care tasks require caregivers to accept again. Completed history is kept.</p>}
    {p.visit && p.hasLinkedCare && <label className={`${styles.checkField} ${styles.full}`}><input type="checkbox" name="rescheduleCare" /><span>If changing the time, move linked care tasks and ask caregivers to accept again.</span></label>}
    <div className={`${styles.formActions} ${styles.full}`}><button type="button" onClick={p.onBack}>Cancel</button><button className={styles.primary} type="submit">Save event</button></div>
  </form>;
}
