import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function serverClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Error('Authentication is not configured.');
  const store=await cookies();
  return createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:url.startsWith('https:')},cookies:{getAll:()=>store.getAll(),setAll:entries=>{try{entries.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Proxy refreshes cookies for Server Components. */}}}});
}
