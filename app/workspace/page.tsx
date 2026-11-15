import {redirect} from 'next/navigation';
import ConnectedWorkspace,{type Section} from '../../src/features/workspace/ConnectedWorkspace';
import {peopleFoundationReady} from '../../src/lib/supabase/foundation';
import {serverClient} from '../../src/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{section?:string;recipient?:string;capture?:string}>}){
 if(!peopleFoundationReady())redirect('/demo');
 const c=await serverClient();const {data:{user}}=await c.auth.getUser();
 if(!user)redirect('/auth');
 const query=await searchParams;
 const section=(['calendar','coverage','medications','health','care','account'].includes(query.section||'')?query.section:'home') as Section;
 return <ConnectedWorkspace initialSection={section} initialRecipient={query.recipient||''} initialCapture={query.capture==='1'}/>;
}

