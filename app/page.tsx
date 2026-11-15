import DemoHome from '../src/features/coverage/DemoHome';
import {redirect} from 'next/navigation';
import {peopleFoundationReady} from '../src/lib/supabase/foundation';
export default function Home() { if(peopleFoundationReady())redirect('/workspace');return <DemoHome />; }
