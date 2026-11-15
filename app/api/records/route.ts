import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '../../../src/lib/supabase/server';
import { allowedOrigin } from '../../../src/lib/supabase/request-origin';

const cipher=z.object({v:z.literal(1),iv:z.string().length(16),data:z.string().min(24).max(32000)}).strict();
const base={id:z.uuid(),operationId:z.uuid()};
const create=z.object({...base,type:z.literal('create'),recipientId:z.uuid(),category:z.enum(['medications','tasks','meals','care','health']),kind:z.enum(['medication','report','visit','task','meal','note']),contentCipher:cipher,assignedTo:z.uuid().nullable(),startsAt:z.iso.datetime().nullable(),endsAt:z.iso.datetime().nullable()}).strict();
const cancel=z.object({...base,type:z.literal('cancel'),expectedVersion:z.number().int().positive()}).strict();
const schema=z.discriminatedUnion('type',[
 create,
 z.object({...base,type:z.literal('revise'),expectedVersion:z.number().int().positive(),contentCipher:cipher,assignedTo:z.uuid().nullable(),startsAt:z.iso.datetime().nullable(),endsAt:z.iso.datetime().nullable()}).strict(),
 z.object({type:z.literal('batch'),commands:z.array(create).min(1).max(29)}).strict(),
 z.object({type:z.literal('cancelBatch'),commands:z.array(cancel).min(1).max(29)}).strict(),
 z.object({...base,type:z.enum(['accept','decline','arrive','cancel']),expectedVersion:z.number().int().positive()}).strict(),
 z.object({...base,type:z.enum(['complete','record']),expectedVersion:z.number().int().positive(),contentCipher:cipher}).strict(),
]);
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
function failure(message=''){
 const conflict=message.includes('VERSION_CONFLICT');
 if(message.includes('SCHEDULE_CONFLICT'))return reply({message:'This helper already has an overlapping visit. Choose another time or helper.'},409);
 const forbidden=message.includes('FORBIDDEN');
 const invalid=message.includes('INVALID_TRANSITION')||message.includes('VALIDATION_FAILED');
 return reply({message:conflict?'This record changed. Refresh before trying again.':forbidden?'Your access does not allow this action.':invalid?'This action is not available for the current status or visit time.':'Care records are temporarily unavailable.'},conflict?409:forbidden?403:invalid?400:503);
}
export async function GET(request:NextRequest){
 const recipient=z.uuid().safeParse(request.nextUrl.searchParams.get('recipient'));
 if(!recipient.success)return reply({message:'Choose a care recipient.'},400);
 try{
  const c=await serverClient();const {data:{user}}=await c.auth.getUser();
  if(!user)return reply({message:'Sign in to continue.'},401);
  const view=await c.rpc('handsin_view');
  if(view.error||!view.data?.recipients?.some((r:{id:string})=>r.id===recipient.data))return failure('FORBIDDEN');
  const records=await c.from('care_records').select('*').eq('recipient_id',recipient.data).order('updated_at',{ascending:false});
  if(records.error)return failure();
  const ids=records.data.map(r=>r.id);
  const events=ids.length?await c.from('care_record_events').select('*').in('record_id',ids).order('created_at'): {data:[],error:null};
  if(events.error)return failure();
  return reply({records:records.data,events:events.data});
 }catch{return failure();}
}
export async function POST(request:NextRequest){
 if(!allowedOrigin(request))return failure('FORBIDDEN');
 try{
  const body=await request.text();if(body.length>1000000)return reply({message:'Record is too large.'},413);
  const p=schema.parse(JSON.parse(body));const c=await serverClient();
  const {data:{user}}=await c.auth.getUser();if(!user)return reply({message:'Sign in to continue.'},401);
  const r=p.type==='batch'||p.type==='cancelBatch'?await c.rpc(p.type==='batch'?'handsin_record_batch':'handsin_record_cancel_batch',{commands:p.commands}):await c.rpc(p.type==='revise'?'handsin_record_revision':'handsin_record_command',{p});return r.error?failure(r.error.message):reply(r.data);
 }catch(e){return e instanceof z.ZodError||e instanceof SyntaxError?reply({message:'Check the record fields.'},400):failure();}
}
