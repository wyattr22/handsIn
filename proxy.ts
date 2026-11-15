import { createServerClient } from '@supabase/ssr';
import { NextResponse,type NextRequest } from 'next/server';
import {peopleFoundationReady} from './src/lib/supabase/foundation';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!peopleFoundationReady()||!url||!key)return response;
 const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:request.nextUrl.protocol==='https:'},cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll:entries=>{entries.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});entries.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
 }});
 await client.auth.getClaims();
 response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/workspace/:path*','/people/connected/:path*','/auth','/join','/api/family','/api/records','/api/auth']};
