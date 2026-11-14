import Link from 'next/link';
import styles from '../../src/features/coordination/calendar.module.css';

export const metadata = { title: 'Calendar & delegation — HandsIn' };
export default function CalendarPage() {
  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/" className="wordmark">Hands<span>In</span></Link><span>Calendar & delegation</span></header>
    <section className={styles.intro}><p className={styles.eyebrow}>One circle. Everyone connected.</p><h1>A little clarity.<br />A lot more care.</h1><p>Plan appointments, share responsibilities, and see who has accepted each task.</p></section>
    <section className={styles.notice}><h2>Shared calendar setup is pending</h2><p>The people, authentication, and database services are not connected on this branch yet. Your family’s calendar will appear here once those services are ready.</p><Link className={styles.primary} href="/calendar/demo">Explore the fictional demo →</Link><p>The demo uses fictional people and resets when you leave. It does not send reminders or save real care records.</p></section>
  </main>;
}
