import { redirect } from 'next/navigation';
import { serverClient } from '../../src/lib/supabase/server';
import ConnectedPeople from '../../src/features/people/ConnectedPeople';
import PeopleApp from '../../src/features/people/PeopleApp';
import { peopleFoundationReady } from '../../src/lib/supabase/foundation';
export const dynamic='force-dynamic';
export default async function PeoplePage(){if(!peopleFoundationReady())return <PeopleApp configurationError/>;const c=await serverClient();const {data:{user}}=await c.auth.getUser();if(!user)redirect('/auth');return <ConnectedPeople/>;}
