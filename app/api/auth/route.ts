import { NextRequest,NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash,randomBytes } from 'node:crypto';
import { z } from 'zod';
import { serverClient } from '../../../src/lib/supabase/server';
import { allowedOrigin } from '../../../src/lib/supabase/request-origin';
import { peopleFoundationReady } from '../../../src/lib/supabase/foundation';
const schema=z.discriminatedUnion('type',[
 z.object({type:z.literal('signUp'),name:z.string().trim().min(1).max(100),email:z.email().max(254),password:z.string().min(12).max(128)}).strict(),
 z.object({type:z.literal('signIn'),email:z.email().max(254),password:z.string().min(1).max(128),forceEmail:z.boolean().optional()}).strict(),
 z.object({type:z.literal('verify'),email:z.email(),code:z.string().regex(/^\d{6}$/),registration:z.boolean()}).strict(),
 z.object({type:z.literal('resend'),email:z.email(),registration:z.boolean()}).strict(),
 z.object({type:z.literal('signOut')}).strict(),
]);
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function POST(request:NextRequest){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!peopleFoundationReady())return reply({message:'The People authentication foundation has not been enabled for this environment.'},503);
 if(!allowedOrigin(request))return reply({message:'Request origin rejected.'},403);
 if(Number(request.headers.get('content-length')||0)>8192)return reply({message:'Request too large.'},413);
 try{
  const p=schema.parse(await request.json());const client=await serverClient();const store=await cookies();const opts={httpOnly:true,sameSite:'strict' as const,secure:request.nextUrl.protocol==='https:',path:'/',maxAge:600};
  if(p.type==='signUp'){
   const {error}=await client.auth.signUp({email:p.email,password:p.password,options:{data:{display_name:p.name}}});
   if(error)return reply({message:'Unable to create this account. Check the details or try signing in.'},400);
   store.set('hi-signup',p.email.toLowerCase(),opts);return reply({requiresCode:true,registration:true,message:'Check your email for your confirmation code.'});
  }
  if(p.type==='signIn'){
   const {data,error}=await client.auth.signInWithPassword({email:p.email,password:p.password});if(error||!data.user)return reply({message:'Unable to sign in. Check your email, password, and confirmation.'},400);
   const token=store.get('hi-device-'+data.user.id)?.value||'';
   const proof=await client.rpc('handsin_device',{p:{type:'begin',deviceHash:hash(token),requireEmail:p.forceEmail||false}});
   if(proof.error)return reply({message:'The local access foundation is unavailable. Start the local services.'},503);
   if(proof.data.trusted)return reply({userId:data.user.id,name:data.user.user_metadata.display_name});
   store.set('hi-challenge',proof.data.challenge,opts);
   const {error:sendError}=await client.auth.signInWithOtp({email:p.email,options:{shouldCreateUser:false}});
   if(sendError)return reply({message:'We could not send the device-verification email. Try again shortly.'},400);
   return reply({requiresCode:true,registration:false,message:'Verify this device using the code in your email.'});
  }
  if(p.type==='verify'){
   const challenge=store.get('hi-challenge')?.value;
   if(p.registration ? store.get('hi-signup')?.value!==p.email.toLowerCase() : !challenge)return reply({message:'Start signup or sign-in again before entering a code.'},403);
   if(!p.registration){const {data:{user}}=await client.auth.getUser();if(user?.email?.toLowerCase()!==p.email.toLowerCase())return reply({message:'Account mismatch. Start sign-in again.'},403);}
   const {data,error}=await client.auth.verifyOtp({email:p.email,token:p.code,type:p.registration?'signup':'email'});
   if(error||!data.user)return reply({message:'That code is invalid or expired. Check the latest email.'},400);
   const device=randomBytes(32).toString('hex');
   const proof=await client.rpc('handsin_device',{p:{type:p.registration?'registration':'finish',challenge,deviceHash:hash(device)}});
   if(proof.error){await client.auth.signOut({scope:'local'});return reply({message:'Device verification could not be completed. Please sign in again.'},403);}
   store.set('hi-device-'+data.user.id,device,{...opts,maxAge:30*24*3600});store.delete('hi-challenge');store.delete('hi-signup');
   return reply({userId:data.user.id,name:data.user.user_metadata.display_name});
  }
  if(p.type==='resend'){
   if(p.registration){if(store.get('hi-signup')?.value!==p.email.toLowerCase())return reply({message:'Start account creation again.'},403);const {error}=await client.auth.resend({type:'signup',email:p.email});if(error)return reply({message:'Wait a moment before requesting another code.'},400);}
   else{const {data:{user}}=await client.auth.getUser();if(!store.get('hi-challenge')||user?.email!==p.email)return reply({message:'Start sign-in again.'},403);const {error}=await client.auth.signInWithOtp({email:p.email,options:{shouldCreateUser:false}});if(error)return reply({message:'Wait a moment before requesting another code.'},400);}
   return reply({message:'A new code has been sent.'});
  }
  await client.rpc('handsin_device',{p:{type:'logout'}});await client.auth.signOut({scope:'local'});store.delete('hi-challenge');return reply({message:'Signed out.'});
 }catch{return reply({message:'Check the form. Passwords for new accounts need at least 12 characters.'},400);}
}
