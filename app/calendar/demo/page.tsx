import CalendarDemo from '../../../src/features/coordination/CalendarDemo';
import DemoAppFrame from '../../../src/features/coverage/DemoAppFrame';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fictional calendar demo — HandsIn' };
export default function DemoPage() { return <DemoAppFrame wide><CalendarDemo embedded /></DemoAppFrame>; }
