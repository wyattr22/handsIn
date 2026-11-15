'use client';
import Link from 'next/link';
import type { CoordinationCommand, CoordinationView, Task } from '../../contracts/coordination';
import { assignmentPriority } from '../../server/domain/coordination/service';
import { parts } from '../../server/domain/coordination/time';
import { roleLabel } from './EventEditor';
import { timeRange } from './calendarMath';
import styles from './calendar.module.css';
interface Props {
  tasks: Task[]; view: CoordinationView; actor: string; canManage: (task: Task) => boolean;
  onAssign: (task: Task, priority: number) => void; onOutcome: (task: Task) => void;
  onCoverage: () => void; run: (command: CoordinationCommand) => void;
}
export default function CaregiverPanel(p: Props) {
  const helperName = (id: string) => p.view.helpers.find(h => h.id === id)?.name || 'Caregiver';
  const active = (t: Task) => !['completed', 'declined_by_recipient', 'canceled'].includes(t.status);
  return <><h3 className={styles.sectionTitle}>Who’s helping?</h3>{p.tasks.map(task => {
    const assigned = p.view.assignments.filter(a => a.taskId === task.id && ['requested', 'accepted'].includes(a.status));
    const priorities = Array.from(new Set([0, 1, ...assigned.map(assignmentPriority)])).sort((a, b) => a - b);
    const primary = assigned.find(a => a.status === 'accepted' && assignmentPriority(a) === 0);
    return <section key={task.id} className={styles.careSection}>
      {p.tasks.length > 1 && <h3>{task.title}</h3>}
      <p className={styles.hint}><strong>Care window:</strong> {timeRange({ ...task, kind: 'task', canceled: task.status === 'canceled' }, task.timezone)} · {task.timezone.replaceAll('_', ' ')}</p>
      {priorities.map(priority => <div className={styles.roleRow} key={priority}><div><strong>{roleLabel(priority)}</strong>{assigned.filter(a => assignmentPriority(a) === priority).length ? assigned.filter(a => assignmentPriority(a) === priority).map(a => <div className={styles.personLine} key={a.id}><span className={styles.avatar} aria-hidden="true">{helperName(a.helperId).split(' ').map(w => w[0]).slice(0, 2).join('')}</span><span>{helperName(a.helperId)}<small>{a.status === 'accepted' ? priority === 0 ? 'Accepted responsibility' : 'Accepted as backup' : 'Waiting for response'}</small></span></div>) : <p className={styles.hint}>{priority === 0 ? 'Not assigned yet' : 'Optional backup'}</p>}</div>{p.canManage(task) && active(task) && <button type="button" onClick={() => p.onAssign(task, priority)}>{assigned.some(a => assignmentPriority(a) === priority) ? 'Change' : 'Choose'}</button>}</div>)}
      {p.canManage(task) && active(task) && <button className={styles.textButton} onClick={() => p.onAssign(task, Math.max(...priorities) + 1)} disabled={Math.max(...priorities) >= 5}>+ Add another backup</button>}
      {assigned.filter(a => a.status === 'requested' && a.helperId === p.actor).map(a => <div className={styles.responseBox} key={a.id}><p>You’ve been asked to be the {assignmentPriority(a) === 0 ? 'primary caregiver' : 'backup caregiver'}.</p><div className={styles.actions}><button className={styles.primary} onClick={() => p.run({ type: 'respondAssignment', id: a.id, expectedVersion: a.version, response: 'accepted' })}>Accept</button><button onClick={() => p.run({ type: 'respondAssignment', id: a.id, expectedVersion: a.version, response: 'declined' })}>Decline</button></div></div>)}
      {task.recordingPolicy === 'shared_care' && <p><Link href={`/care/demo?task=${task.id}`}>Open meal / daily-care record →</Link></p>}
      {primary?.helperId === p.actor && active(task) && <div className={styles.actions}>{task.recordingPolicy !== 'shared_care' && <button className={styles.primary} disabled={!!task.medicationOccurrenceId || task.category === 'medication'} onClick={() => p.onOutcome(task)}>Record outcome</button>}<button onClick={p.onCoverage}>Request coverage</button></div>}
      <p className={styles.hint}>Backups take over only after a new primary request is accepted.</p>
      {p.canManage(task) && assigned.length > 0 && <details className={styles.history}><summary>Manage current requests</summary>{assigned.map(a => <div className={styles.requestRow} key={a.id}><span>{helperName(a.helperId)} · {roleLabel(assignmentPriority(a))}</span><button onClick={() => p.run({ type: 'cancelAssignment', id: a.id, expectedVersion: a.version })}>Withdraw</button></div>)}</details>}
      {p.view.instructions.filter(i => i.id === task.instructionId && i.current).map(i => <div className={styles.instruction} key={i.id}><strong>Care instructions</strong><p>{i.text}</p></div>)}
      <details className={styles.history}><summary>Activity history</summary><ul>{p.view.audit.filter(a => a.taskId === task.id).map(a => <li key={a.id}>{({ createTask: 'Task created', requestAssignment: 'Caregiver requested', respondAssignment: 'Caregiver responded', outcome: 'Outcome recorded', editTask: 'Task updated', cancelTask: 'Task canceled', cancelAssignment: 'Request withdrawn', cancelVisit: 'Appointment canceled' })[a.action] || a.action} · {helperName(a.actorId)}<small>{parts(a.at, task.timezone).replace('T', ' ')}{a.action === 'outcome' ? ` · ${a.detail}` : ''}</small></li>)}</ul>{!p.view.audit.some(a => a.taskId === task.id) && <p>No changes recorded yet.</p>}</details>
    </section>;
  })}</>;
}
