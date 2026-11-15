import Link from 'next/link';
import {redirect} from 'next/navigation';
import {serverClient} from '../../../src/lib/supabase/server';
import ConnectedPeople from '../../../src/features/people/ConnectedPeople';
import {peopleFoundationReady} from '../../../src/lib/supabase/foundation';
export const dynamic='force-dynamic';
export default async function Page(){if(!peopleFoundationReady()||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return <main style={{maxWidth:700,margin:'60px auto',padding:24}}><h1>Connected accounts need setup</h1><p>The unified fictional workspace is available. Real accounts require the People backend and verified-device foundation to be configured.</p><Link href="/people">Return to your care circle →</Link></main>;const c=await serverClient();const {data:{user}}=await c.auth.getUser();if(!user)redirect('/auth');return <ConnectedPeople/>;}
