import CalendarDemo from '../../../src/features/coordination/CalendarDemo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fictional calendar demo — HandsIn' };
export default function DemoPage() { return <CalendarDemo initialNow={new Date().toISOString()} />; }
