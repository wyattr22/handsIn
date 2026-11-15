import {redirect} from 'next/navigation';
import {peopleFoundationReady} from '../../src/lib/supabase/foundation';
export default function Page(){redirect(peopleFoundationReady()?'/workspace?section=calendar':'/calendar/demo');}
