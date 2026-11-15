// Real local Auth + REST + PostgreSQL integration. No browser or hosted targets.
import {createClient} from '@supabase/supabase-js';
import {Client} from 'pg';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const env=Object.fromEntries((await fs.readFile('.env.local','utf8')).trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
const cfg=JSON.parse(await fs.readFile('.local-services/config.json','utf8'));
const db=new Client({host:'127.0.0.1',port:55432,user:'postgres',password:cfg.pgPassword,database:'postgres'});await db.connect();
const run=Date.now();const password=randomBytes(24).toString('base64url');
const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
async function cipher(value,context='test'){const iv=crypto.getRandomValues(new Uint8Array(12));return {v:1,iv:Buffer.from(iv).toString('base64'),data:Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(JSON.stringify(value)))).toString('base64')};}
async function code(email){for(let i=0;i<30;i++){const list=await(await fetch('http://127.0.0.1:58025/api/v1/messages')).json();const message=list.messages?.find(m=>m.To?.some(t=>t.Address===email));if(message){const full=await(await fetch('http://127.0.0.1:58025/api/v1/message/'+message.ID)).json();const match=(full.Text+' '+full.HTML).match(/\b(\d{6})\b/);if(match)return match[1];}await new Promise(r=>setTimeout(r,200));}throw Error('Test email missing');}
async function account(label){const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const email=`records-${label}-${run}@example.test`;let result=await client.auth.signUp({email,password,options:{data:{display_name:label+' test'}}});assert.equal(result.error,null);result=await client.auth.verifyOtp({email,token:await code(email),type:'signup'});assert.equal(result.error,null);const proof=await client.rpc('handsin_device',{p:{type:'registration',deviceHash:createHash('sha256').update(randomUUID()).digest('hex')}});assert.equal(proof.error,null);return {client,email,id:result.data.user.id};}
async function rpc(a,p){const r=await a.client.rpc('handsin_record_command',{p});assert.equal(r.error,null,r.error?.message);return r.data;}
async function denied(a,p,match='FORBIDDEN'){const r=await a.client.rpc('handsin_record_command',{p});assert.ok(r.error?.message.includes(match),r.error?.message||'Unexpected allowed operation');}
try{
 const owner=await account('organizer'),helper=await account('helper'),outsider=await account('outsider');
 const recipientId=randomUUID(),circleId=randomUUID();
 let result=await owner.client.rpc('handsin_command',{p:{type:'createFamily',circleId,recipientId,nameCipher:await cipher('Test family'),recipientCipher:await cipher('Fictional recipient')}});assert.equal(result.error,null);
 const tokenHash=createHash('sha256').update(randomUUID()).digest('hex');
 result=await owner.client.rpc('handsin_command',{p:{type:'invite',recipientId,email:helper.email,tokenHash,tier:1,overrides:{},managementRole:'member',keyEnvelope:await cipher('test envelope'),accessExpiresAt:null}});assert.equal(result.error,null);
 const wrong=await outsider.client.rpc('handsin_command',{p:{type:'acceptInvite',tokenHash}});assert.ok(wrong.error);
 result=await helper.client.rpc('handsin_command',{p:{type:'acceptInvite',tokenHash}});assert.equal(result.error,null);
 console.log('PASS real local signup, email verification, verified sessions and email-bound invitation');
 const make=async(kind,category,assignedTo=null)=>({type:'create',operationId:randomUUID(),id:randomUUID(),recipientId,kind,category,contentCipher:await cipher({title:'private-'+kind,detail:'Fictional care instructions'}),assignedTo,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString()});
 const visit=await make('visit','tasks',helper.id);assert.equal((await rpc(owner,visit)).status,'requested');
 assert.equal((await rpc(owner,visit)).version,1,'retry idempotent');
 await denied(owner,{...visit,contentCipher:await cipher('changed')},'VERSION_CONFLICT');
 const health=await make('report','health');await rpc(owner,health);
 await rpc(owner,await make('medication','medications'));await rpc(owner,await make('meal','meals'));await rpc(owner,await make('note','care'));
 assert.equal((await helper.client.from('care_records').select('*')).data.length,2);
 assert.equal((await outsider.client.from('care_records').select('*')).data.length,0);
 assert.equal((await outsider.client.from('care_record_events').select('*')).data.length,0);
 await denied(helper,await make('task','tasks'));
 await denied(owner,await make('visit','tasks',outsider.id));
 const direct=await helper.client.from('care_records').update({status:'arrived'}).eq('id',visit.id);assert.ok(direct.error);
 console.log('PASS category isolation, unrelated accounts, assignment authorization and direct-write denial');
 const overlap=await make('visit','tasks',helper.id);await denied(owner,overlap,'SCHEDULE_CONFLICT');
 const batchOne=await make('medication','medications'),batchTwo=await make('medication','medications');
 result=await owner.client.rpc('handsin_record_batch',{commands:[batchOne,{...batchTwo,category:'unknown'}]});assert.ok(result.error);
 assert.equal((await owner.client.from('care_records').select('id').eq('id',batchOne.id)).data.length,0,'failed batch rolls back its first record');
 result=await owner.client.rpc('handsin_record_batch',{commands:[batchOne,batchTwo]});assert.equal(result.error,null);
 result=await owner.client.rpc('handsin_record_batch',{commands:[batchOne,batchTwo]});assert.equal(result.error,null);assert.equal(result.data.length,2);
 const cancelBatch=[batchOne,batchTwo].map(r=>({type:'cancel',id:r.id,operationId:randomUUID(),expectedVersion:1}));
 result=await owner.client.rpc('handsin_record_cancel_batch',{commands:cancelBatch});assert.equal(result.error,null);
 const editable=await make('task','tasks');await rpc(owner,editable);
 const revision={type:'revise',id:editable.id,operationId:randomUUID(),expectedVersion:1,contentCipher:await cipher('Revised fictional instruction'),assignedTo:null,startsAt:editable.startsAt,endsAt:editable.endsAt};
 result=await helper.client.rpc('handsin_record_revision',{p:revision});assert.ok(result.error);
 result=await owner.client.rpc('handsin_record_revision',{p:revision});assert.equal(result.error,null);assert.equal(result.data.version,2);
 const revisionHistory=(await owner.client.from('care_record_events').select('*').eq('id',revision.operationId).single()).data;
 assert.deepEqual(revisionHistory.previous_cipher,editable.contentCipher);
 console.log('PASS atomic capture/cancellation batches, overlapping-visit denial and preserved source revisions');
 const secondRecipient=randomUUID();
 result=await owner.client.rpc('handsin_add_recipient',{p:{circleId,recipientId:secondRecipient,recipientCipher:await cipher('Second fictional person')}});assert.equal(result.error,null);
 const otherPerson=await make('task','tasks');otherPerson.recipientId=secondRecipient;await rpc(owner,otherPerson);
 assert.equal((await helper.client.from('care_records').select('*').eq('recipient_id',secondRecipient)).data.length,0);
 result=await helper.client.rpc('handsin_add_recipient',{p:{circleId,recipientId:randomUUID(),recipientCipher:await cipher('Not permitted')}});assert.ok(result.error);
 const future=await make('visit','tasks',helper.id);future.startsAt=new Date(Date.now()+86400000).toISOString();future.endsAt=new Date(Date.now()+90000000).toISOString();await rpc(owner,future);
 await rpc(helper,{type:'accept',id:future.id,operationId:randomUUID(),expectedVersion:1});
 await denied(helper,{type:'arrive',id:future.id,operationId:randomUUID(),expectedVersion:2},'INVALID_TRANSITION');
 const meal=await make('meal','meals');await rpc(owner,meal);
 await denied(helper,{type:'record',id:meal.id,operationId:randomUUID(),expectedVersion:1,contentCipher:await cipher('not permitted')});
 await rpc(owner,{type:'record',id:meal.id,operationId:randomUUID(),expectedVersion:1,contentCipher:await cipher('Fictional meal recorded')});
 console.log('PASS second-recipient isolation, early-arrival rejection and category-authorized care updates');
 const command=(type,version)=>({type,operationId:randomUUID(),id:visit.id,expectedVersion:version});
 await denied(owner,command('accept',1));
 await denied(helper,command('arrive',1),'INVALID_TRANSITION');
 const accept=command('accept',1);assert.equal((await rpc(helper,accept)).status,'accepted');
 await denied(helper,command('decline',1),'VERSION_CONFLICT');
 const arrival=command('arrive',2);assert.equal((await rpc(helper,arrival)).status,'arrived');assert.equal((await rpc(helper,arrival)).version,3);
 const after=(await owner.client.from('care_records').select('*').eq('id',visit.id).single()).data;assert.ok(after.arrived_at);assert.deepEqual(after.content_cipher,visit.contentCipher);
 await rpc(helper,{...command('complete',3),contentCipher:await cipher({note:'Fictional visit completed'})});
 assert.equal((await owner.client.from('care_record_events').select('*').eq('record_id',visit.id)).data.length,4);
 console.log('PASS visit acceptance, time-window check-in, immutable instructions, completion history and retry/version guards');
 const helperGrant=(await db.query('select a.id from public.recipient_access a join public.circle_memberships m on m.id=a.membership_id where a.recipient_id=$1 and m.user_id=$2',[recipientId,helper.id])).rows[0].id;
 await db.query("update public.recipient_access set expires_at=now()-interval '1 second' where id=$1",[helperGrant]);
 assert.equal((await helper.client.from('care_records').select('*')).data.length,0);
 await denied(helper,arrival);
 await db.query('update public.recipient_access set expires_at=null where id=$1',[helperGrant]);
 result=await owner.client.rpc('handsin_command',{p:{type:'revokeAccess',accessId:helperGrant,expectedVersion:1}});assert.equal(result.error,null);
 assert.equal((await helper.client.from('care_records').select('*')).data.length,0);
 await denied(helper,arrival);
 const stored=await db.query('select content_cipher::text from public.care_records where recipient_id=$1',[recipientId]);assert.ok(stored.rows.every(r=>!r.content_cipher.includes('Fictional')&&!r.content_cipher.includes('private-')));
 const secured=await db.query("select relname,relrowsecurity from pg_class where oid in ('public.care_records'::regclass,'public.care_record_events'::regclass)");assert.ok(secured.rows.every(r=>r.relrowsecurity));
 const exposed=await db.query("select has_function_privilege('anon','public.handsin_record_command(jsonb)','execute') as anon_rpc,has_table_privilege('authenticated','public.care_records','insert') as direct_insert,has_table_privilege('authenticated','public.care_records','update') as direct_update");assert.deepEqual(exposed.rows[0],{anon_rpc:false,direct_insert:false,direct_update:false});
 console.log('PASS expiry, revocation (including retries), ciphertext-only persistence');
 // Raw auth session revocation must work even if device proof has not been removed.
 const oldSession=(await outsider.client.auth.getSession()).data.session;
 await outsider.client.auth.signOut({scope:'local'});
 const revokedClient=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:'Bearer '+oldSession.access_token}},auth:{persistSession:false,autoRefreshToken:false}});
 assert.ok((await revokedClient.rpc('handsin_view')).error,'revoked auth session cannot reuse device trust');
 await owner.client.rpc('handsin_device',{p:{type:'logout'}});
 assert.equal((await owner.client.from('care_records').select('*')).data.length,0);
 console.log('PASS logout removes data access; connected record integration checks complete');
}finally{await db.end();}
