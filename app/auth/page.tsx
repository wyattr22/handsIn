import ConnectedAuth from '../../src/features/people/ConnectedAuth';
import { peopleFoundationReady } from '../../src/lib/supabase/foundation';
import PeopleApp from '../../src/features/people/PeopleApp';
export default function AuthPage(){return peopleFoundationReady()?<ConnectedAuth/>:<PeopleApp configurationError/>;}
