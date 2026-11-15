import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { serverClient } from '../../../src/lib/supabase/server';
import { allowedOrigin } from '../../../src/lib/supabase/request-origin';
const id=z.uuid();const cipher=z.object({v:z.literal(1),iv:z.string().max(100),data:z.string().max(32000)}).strict();
const overrides=z.object({medications:z.boolean().optional(),tasks:z.boolean().optional(),meals:z.boolean().optional(),care:z.boolean().optional(),health:z.boolean().optional()}).strict();
const command=z.discriminatedUnion('type',[
 z.object({type:z.literal('addRecipient'),circleId:id,recipientId:id,recipientCipher:cipher}).strict(),
 z.object({type:z.literal('createFamily'),circleId:id,recipientId:id,nameCipher:cipher,recipientCipher:cipher}).strict(),
 z.object({type:z.literal('invite'),recipientId:id,email:z.email().max(254),tokenHash:z.string().regex(/^[a-f0-9]{64}$/),tier:z.number().int().min(1).max(3),overrides,managementRole:z.enum(['admin','member']),keyEnvelope:cipher,accessExpiresAt:z.iso.datetime({offset:true}).nullable()}).strict(),
 z.object({type:z.enum(['inspectInvite','acceptInvite']),tokenHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
 z.object({type:z.literal('revokeAccess'),accessId:id,expectedVersion:z.number().int().positive()}).strict(),
 z.object({type:z.literal('revokeInvite'),invitationId:id}).strict(),
]);
function reply(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});}
function fail(e:{message?:string;code?:string}){const codes=['EMAIL_VERIFICATION_REQUIRED','DEVICE_VERIFICATION_REQUIRED','INVITATION_UNAVAILABLE','FORBIDDEN','VERSION_CONFLICT','VALIDATION_FAILED'];const code=codes.find(c=>e.message?.includes(c));return reply({code:code||'SERVICE_UNAVAILABLE',message:code==='EMAIL_VERIFICATION_REQUIRED'?'Verify your email before joining this family.':code==='INVITATION_UNAVAILABLE'?'This invitation is expired, used, revoked, or belongs to a different verified email.':code==='DEVICE_VERIFICATION_REQUIRED'?'Verify this device by signing in again.':code==='VERSION_CONFLICT'?'This access changed. Refresh and try again.':code==='FORBIDDEN'?'Your permissions do not allow this action.':'The family service is unavailable. Start the local services and try again.'},code==='VERSION_CONFLICT'?409:code?403:503);}
export async function GET(){try{const c=await serverClient();const {data:{user}}=await c.auth.getUser();if(!user)return reply({code:'UNAUTHENTICATED',message:'Sign in to continue.'},401);const r=await c.rpc('handsin_view');return r.error?fail(r.error):reply(r.data);}catch{return fail({});}}
export async function POST(request:NextRequest){if(!allowedOrigin(request))return reply({code:'FORBIDDEN',message:'Request origin rejected.'},403);if(Number(request.headers.get('content-length')||0)>65536)return reply({message:'Request too large.'},413);try{const p=command.parse(await request.json());const c=await serverClient();const {data:{user}}=await c.auth.getUser();if(!user)return reply({code:'UNAUTHENTICATED',message:'Sign in to continue.'},401);const r=await c.rpc(p.type==='addRecipient'?'handsin_add_recipient':'handsin_command',{p});return r.error?fail(r.error):reply(r.data);}catch(e){return e instanceof z.ZodError?reply({code:'VALIDATION_FAILED',message:'Check the form fields.'},400):fail({});}}

