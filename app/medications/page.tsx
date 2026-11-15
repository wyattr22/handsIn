import RecordsPage from '../../src/features/workspace/RecordsPage';
import {redirect} from 'next/navigation';
import {peopleFoundationReady} from '../../src/lib/supabase/foundation';
export default function Page(){if(peopleFoundationReady())redirect('/workspace?section=medications');return <RecordsPage kind="medications"/>;}
