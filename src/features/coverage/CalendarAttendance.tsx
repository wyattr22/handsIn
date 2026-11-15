'use client';
import Link from 'next/link';
import type { Command, Coverage } from './domain';
import { calendarAttendance } from './calendar-connection';
import styles from '../coordination/calendar.module.css';

export default function CalendarAttendance({ coverage: c, actor, now, act, openHandoff }: {
  coverage: Coverage; actor: string; now: string; act: (command: Command) => void; openHandoff: () => void;
}) {
  const helper = actor === c.helperId;
  const inWindow = Date.parse(now) >= Date.parse(c.start) && Date.parse(now) < Date.parse(c.end);
  const canRespond = helper && c.state === 'seeking' && c.invitation === 'pending' && Date.parse(now) < Date.parse(c.respondBy);
  return <section aria-label="Coverage and arrival" className={styles.careSection}>
    <h3 className={styles.sectionTitle}>Who's helping, and have they arrived?</h3>
    <p role="status"><strong>{calendarAttendance(c, now)}</strong></p>
    {c.arrivedAt ? <p>Self-reported arrival by {c.helperName}. This does not confirm ongoing presence or completion of the visit.</p> : <p>Acceptance confirms the plan. Arrival is recorded separately by the helper.</p>}
    {canRespond ? <><p>{c.coordinatorName} requested {c.helperName} for these duties:</p><ul>{c.tasks.filter(t => c.taskIds.includes(t.id)).map(t => <li key={t.id}>{t.title}</li>)}</ul><p>Review the handoff invitation if you have questions or can cover only part.</p><div className={styles.actions}><button className={styles.primary} onClick={() => act({ type: 'respond', response: 'accepted' })}>Accept coverage for {c.name}</button><button onClick={() => act({ type: 'respond', response: 'declined' })}>Decline coverage</button></div></> : null}
    {helper && c.state === 'confirmed' ? <div className={styles.actions}><button className={styles.primary} disabled={!inWindow || !!c.arrivedAt} onClick={() => act({ type: 'arrive' })}>{c.arrivedAt ? 'Arrival already recorded' : `I'm here with ${c.name}`}</button>{!inWindow ? <p className={styles.hint}>Arrival can be reported during the scheduled visit. Demo tools can advance the clock.</p> : null}</div> : null}
    <div className={styles.actions}><Link href="/coverage/demo" onClick={openHandoff}>Open {c.name}'s handoff →</Link></div>
    {actor === c.coordinatorId && c.state === 'closed' ? <p>Visit report: {c.report || 'No additional note.'} Review unreported or unfinished tasks in the handoff.</p> : null}
  </section>;
}

