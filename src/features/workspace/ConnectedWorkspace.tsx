'use client';
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DeviceAccess from './DeviceAccess';
import CareCalendar,{inCalendar,type CalendarMode} from './CareCalendar';
import {localDate,type CareContent as Content,type CareRecord as RecordRow,type CreateRecord} from './records';
const CaptureRecord=dynamic(()=>import('./CaptureRecord')); 
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {categoryNames,includesCategory,type Access,type Category} from '../people/preview-domain';
import {decrypt,encrypt,loadVault,lockVault,newBundle,saveVault,type Cipher,type Vault} from '../people/vault';
import styles from './trial.module.css';

export type Section='home'|'calendar'|'coverage'|'medications'|'health'|'care'|'account';
interface Recipient extends Access {id:string;circleId:string;nameCipher:Cipher;name?:string;expiresAt:string|null}
interface Member {userId:string;circleId:string;name:string;role:string;access:(Access&{recipientId:string;expiresAt:string|null;revoked:boolean})[]}
interface Family {actorId:string;profile:{name:string};recipients:Recipient[];circles:{id:string;role:string}[];people:Member[]}
interface RecordEvent {id:string;record_id:string;actor_id:string;action:string;created_at:string;content_cipher:Cipher|null;previous_cipher?:Cipher|null;note?:string;previous?:Content}
const sections: {id:Section;label:string;description:string}[]=[
 {id:'calendar',label:'Calendar',description:'See upcoming care and who is there.'},
 {id:'coverage',label:'Temporary coverage',description:'Plan a visit and follow the handoff.'},
 {id:'medications',label:'Medications',description:'Keep reviewed medication instructions together.'},
 {id:'care',label:'Meals & daily care',description:'Follow the plan and record what happened.'},
 {id:'health',label:'Health reports',description:'Keep reviewed reports and questions in one place.'},
];
const kinds:Record<string,{category:Category;label:string}>={visit:{category:'tasks',label:'Care visit'},task:{category:'tasks',label:'Everyday task'},medication:{category:'medications',label:'Reviewed medication'},meal:{category:'meals',label:'Meal plan'},note:{category:'care',label:'Daily care plan'},report:{category:'health',label:'Reviewed health report'}};
const recordContext=(r:{id:string;recipient_id:string;category:Category})=>`record:${r.recipient_id}:${r.category}:${r.id}`;
const eventContext=(r:RecordRow,id:string)=>`event:${r.recipient_id}:${r.category}:${r.id}:${id}`;
async function json(url:string,body?:object){const r=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.message||'Unable to load this workspace.');return d;}
const inputDate=(s:string|null|undefined)=>{if(!s)return '';const d=new Date(s);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const when=(s:string|null)=>s?new Date(s).toLocaleString(): 'Unscheduled';

export default function ConnectedWorkspace({initialSection='home',initialRecipient='',initialCapture=false}:{initialSection?:Section;initialRecipient?:string;initialCapture?:boolean}){
 const [family,setFamily]=useState<Family|null>(null),[vault,setVault]=useState<Vault|null>(null),[selected,setSelected]=useState(initialRecipient);
 const [section,setSection]=useState<Section>(initialSection),[rows,setRows]=useState<RecordRow[]>([]),[events,setEvents]=useState<RecordEvent[]>([]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[form,setForm]=useState(false),[kind,setKind]=useState('visit');
 const [editing,setEditing]=useState<RecordRow|null>(null);
 const [capture,setCapture]=useState<'medications'|'health'|null>(initialCapture&&(initialSection==='medications'||initialSection==='health')?initialSection:null);
 const [calendarDate,setCalendarDate]=useState(localDate(new Date())),[calendarMode,setCalendarMode]=useState<CalendarMode>('week');
 const [report,setReport]=useState<RecordRow|null>(null),[addingPerson,setAddingPerson]=useState(false);const epoch=useRef(0);
 const refresh=useCallback(async()=>{
  const generation=++epoch.current;
  try {
   const f:Family=await json('/api/family');const v=await loadVault(f.actorId);
   for(const recipient of f.recipients){const key=v.families[recipient.circleId]?.recipients[recipient.id]?.labelKey;recipient.name=key?await decrypt<string>(key,recipient.nameCipher,'recipient:'+recipient.id):'Unlock recipient on this device';}
   const id=selected||f.recipients[0]?.id||'';
   const recipient=f.recipients.find(r=>r.id===id);
   let records:RecordRow[]=[],history:RecordEvent[]=[];
   if(recipient&&section!=='account'){
    const data=await json('/api/records?recipient='+id);records=data.records;history=data.events;
    for(const row of records){const key=v.families[recipient.circleId]?.recipients[id]?.categories[row.category];if(!key)throw Error('This device is missing care record keys. Open your invitation on this device.');row.content=await decrypt<Content>(key,row.content_cipher,recordContext(row));}
    for(const event of history){const row=records.find(r=>r.id===event.record_id);if(row&&event.content_cipher){const key=v.families[recipient.circleId].recipients[id].categories[row.category]!;event.note=(await decrypt<{note:string}>(key,event.content_cipher,eventContext(row,event.id))).note;}if(row&&event.previous_cipher){const key=v.families[recipient.circleId].recipients[id].categories[row.category]!;event.previous=await decrypt<Content>(key,event.previous_cipher,recordContext(row));}}
   }
   if(generation!==epoch.current)return;
   setFamily(f);setVault(v);setRows(records);setEvents(history);setError('');
   if(!selected)setSelected(id);
  }catch(e){if(generation===epoch.current){setRows([]);setEvents([]);setFamily(null);setVault(null);setError((e as Error).message);}}
  finally{if(generation===epoch.current)setLoading(false);}
 },[selected,section]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{epoch.current++;clearInterval(timer);window.removeEventListener('focus',focus);};},[refresh]);
 useEffect(()=>{if(form||capture||report)document.getElementById('workspace-editor')?.scrollIntoView({block:'start'});},[form,capture,report,editing]);
 const recipient=family?.recipients.find(r=>r.id===selected);
 const circle=family?.circles.find(c=>c.id===recipient?.circleId);
 const admin=circle?.role==='owner'||circle?.role==='admin';
 const members=family?.people.filter(p=>p.circleId===recipient?.circleId)||[];
 const name=(id:string|null)=>members.find(p=>p.userId===id)?.name||'Care circle member';
 const allowed=(cat:Category)=>!!recipient&&includesCategory(recipient,cat)&&(!recipient.expiresAt||new Date(recipient.expiresAt)>new Date());
 const keyFor=(cat:Category)=>{const key=recipient&&vault?.families[recipient.circleId]?.recipients[selected]?.categories[cat];if(!key||!allowed(cat))throw Error('This recipient category is not available.');return key;};
 async function run(work:()=>Promise<void>){setBusy(true);setNotice('');try{await work();await refresh();}catch(e){setNotice((e as Error).message);await refresh();}finally{setBusy(false);}}
 function choose(id:string){window.scrollTo({top:0,behavior:'instant'});setEditing(null);setCapture(null);epoch.current++;setSelected(id);setRows([]);setEvents([]);setForm(false);setReport(null);setLoading(true);setNotice('');history.replaceState(null,'','/workspace?section='+section+'&recipient='+id);}
 function navigate(id:Section){window.scrollTo({top:0,behavior:'instant'});setEditing(null);setCapture(null);setSection(id);history.replaceState(null,'','/workspace?section='+id+'&recipient='+selected);setForm(false);setReport(null);setNotice('');}
 function add(){setEditing(null);if(section==='medications'||section==='health'){setCapture(section);setForm(false);return;}setKind(section==='care'?(allowed('meals')?'meal':'note'):'visit');setForm(true);setReport(null);}
 async function addPerson(e:FormEvent<HTMLFormElement>){e.preventDefault();const label=String(new FormData(e.currentTarget).get('person')).trim();await run(async()=>{
  if(!label||!family||!vault||!circle)throw Error('Choose an existing care circle first.');
  const id=crypto.randomUUID(),bundle=newBundle();
  const updated=structuredClone(vault);updated.families[circle.id].recipients[id]=bundle;
  // Persist keys before sending ciphertext so an interrupted response cannot orphan the record.
  await saveVault(family.actorId,updated);
  await json('/api/family',{type:'addRecipient',circleId:circle.id,recipientId:id,recipientCipher:await encrypt(bundle.labelKey,label,'recipient:'+id)});
  setAddingPerson(false);setNotice('Person added. Invite helpers specifically for this person from Care circle.');
 });}
 async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);await run(async()=>{
  const cat=kinds[kind].category,id=editing?.id||crypto.randomUUID(),operationId=crypto.randomUUID();
  const title=String(data.get('title')).trim(),detail=String(data.get('detail')).trim();if(!title||!detail)throw Error('Add a title and reviewed instructions.');
  const starts=String(data.get('start')||''),ends=String(data.get('end')||'');
  const startsAt=starts?new Date(starts).toISOString():null,endsAt=ends?new Date(ends).toISOString():null;
  if(endsAt&&(!startsAt||endsAt<=startsAt))throw Error('The end must be after the start.');
  const contentCipher=await encrypt(keyFor(cat),{title,detail,reviewed:data.get('reviewed')==='on'},recordContext({id,recipient_id:selected,category:cat}));
  await json('/api/records',editing?{type:'revise',id,operationId,expectedVersion:editing.version,contentCipher,assignedTo:String(data.get('helper')||'')||null,startsAt,endsAt}:{type:'create',id,operationId,recipientId:selected,category:cat,kind,contentCipher,assignedTo:String(data.get('helper')||'')||null,startsAt,endsAt});
  setEditing(null);setForm(false);setNotice('Saved to this person’s shared care workspace.');
 });}
 async function action(row:RecordRow,type:string,note?:string){await run(async()=>{const operationId=crypto.randomUUID();const contentCipher=note?await encrypt(keyFor(row.category),{note},eventContext(row,operationId)):undefined;if(type==='cancel'&&row.content?.medication){const related=rows.filter(r=>(r.id===row.id||r.content?.sourceId===row.id)&&!['completed','canceled'].includes(r.status));await json('/api/records',{type:'cancelBatch',commands:related.map(r=>({type:'cancel',id:r.id,operationId:crypto.randomUUID(),expectedVersion:r.version}))});}else await json('/api/records',{type,id:row.id,operationId,expectedVersion:row.version,...(contentCipher?{contentCipher}:{})});setReport(null);setNotice('Care circle updated.');});}
 const visible=rows.filter(r=>r.recipient_id===selected).filter(r=>section==='home'?!['completed','canceled','declined'].includes(r.status)&&!r.content?.medicationOccurrence:section==='calendar'?inCalendar(r,calendarDate,calendarMode):section==='coverage'?r.kind==='visit':section==='medications'?r.category==='medications'&&!r.content?.medicationOccurrence:section==='health'?r.category==='health':['meals','care','tasks'].includes(r.category)&&r.kind!=='visit').sort((a,b)=>(a.starts_at||'9999').localeCompare(b.starts_at||'9999'));
 const activeRows=rows.filter(r=>r.recipient_id===selected&&!['completed','canceled','declined'].includes(r.status));
 const nextVisit=activeRows.filter(r=>r.kind==='visit').sort((a,b)=>(a.starts_at||'').localeCompare(b.starts_at||''))[0];
 const canViewSection=(id:Section)=>id==='health'?allowed('health'):id==='medications'?allowed('medications'):id==='care'?allowed('care')||allowed('meals')||allowed('tasks'):true;
 const canAdd=admin&&(section==='home'||section==='calendar'||section==='coverage'?allowed('tasks'):section==='medications'?allowed('medications'):section==='health'?allowed('health'):allowed('meals')||allowed('care')||allowed('tasks'));
 return <div className={styles.workspace}><header className={styles.header}><Link href="/workspace" className={styles.brand}><BrandLogo /></Link><nav aria-label="Workspace"><button onClick={()=>navigate('home')} aria-current={section==='home'?'page':undefined}>Home</button><button onClick={()=>navigate('calendar')} aria-current={section==='calendar'?'page':undefined}>Calendar</button><button onClick={()=>navigate('care')}>Daily care</button><Link href={"/people/connected?recipient="+selected}>Care circle</Link></nav><button disabled={busy} onClick={()=>run(async()=>{if(family)await lockVault(family.actorId);await json('/api/auth',{type:'signOut'});location.assign('/auth');})}>Sign out</button></header>
 <main className={styles.main}><p className={styles.caption}>LOCAL TRIAL · FICTIONAL INFORMATION ONLY</p>{family&&<p className={styles.muted}>Signed in as {family.profile.name}</p>}
 {error?<section role="alert" className={styles.card}><h1>Let’s reconnect your care circle</h1><p>{error}</p><Link href="/auth">Sign in</Link> · <button onClick={()=>navigate('account')}>Restore device keys</button> · <button onClick={()=>void refresh()}>Try again</button></section>:<>
 <h1>{section==='home'?'Who are we caring for today?':section==='account'?'Your devices':sections.find(s=>s.id===section)?.label}</h1>
 <div className={styles.profiles} aria-label="People receiving care">{family?.recipients.map(r=><button disabled={busy||!!capture} key={r.id} aria-pressed={r.id===selected} onClick={()=>choose(r.id)}><span className={styles.avatar}>{r.name?.slice(0,1)}</span><span><strong>{r.name}</strong><small>{r.id===selected?'Your current care plan':'Open care plan'}</small></span></button>)}</div>
 {admin&&<button className={styles.secondary} disabled={busy} onClick={()=>setAddingPerson(!addingPerson)}>Add a person receiving care</button>}
 {addingPerson&&<form className={styles.card} onSubmit={addPerson}><label>Person’s name<input name="person" maxLength={100} required/></label><p>Helpers receive access only when you invite them for this person.</p><button disabled={busy} className={styles.primary}>Save person</button></form>}
 {loading&&<p role="status">Loading care records…</p>}
 {family&&selected&&!recipient&&<p role="status">Access to this person has ended. Choose another profile or contact your organizer.</p>}
 {family&&!family.recipients.length&&<section className={styles.card}><h2>Start with your person</h2><p>Create a family or accept an invitation to begin.</p><Link href={"/people/connected?recipient="+selected}>Set up your care circle →</Link></section>}
 {section==='account'&&family&&<DeviceAccess userId={family.actorId} onImported={refresh}/>} 
 {recipient&&!loading&&section!=='account'&&<>
 <p>Care for <strong>{recipient.name}</strong>. {section==='home'?'Choose a section below, or start with the next visit.':'Changes here are shared with the people who have access.'}</p>
 {section==='home'&&<section className={styles.nextAction}><div><p className={styles.caption}>YOUR NEXT STEP</p><h2>{nextVisit?nextVisit.content?.title:'Build a clear care plan'}</h2><p>{nextVisit?name(nextVisit.assigned_to)+' · '+when(nextVisit.starts_at)+' · '+nextVisit.status:'Add reviewed instructions, then invite someone you trust to help.'}</p></div><button className={styles.secondary} onClick={()=>navigate(nextVisit?'coverage':'care')}>{nextVisit?'Review the visit':'Open daily care'} →</button></section>}
 {section==='home'&&<div className={styles.stats}><span><strong>{activeRows.filter(r=>r.kind==='visit').length}</strong> upcoming visits</span><span><strong>{activeRows.filter(r=>['task','meal','note'].includes(r.kind)).length}</strong> care tasks</span><span><strong>{members.length}</strong> people in your circle</span></div>}
 {section==='home'&&<div className={styles.grid}>{sections.map(s=><button disabled={!canViewSection(s.id)} className={styles.card} key={s.id} onClick={()=>navigate(s.id)}><h2>{s.label}</h2><p>{s.description}</p><span>{canViewSection(s.id)?'Open →':'Not shared with your account'}</span></button>)}<Link className={styles.card} href={"/people/connected?recipient="+selected}><h2>Care circle</h2><p>Invite helpers and manage their access.</p><span>Open →</span></Link></div>}
 {section==='calendar'&&<CareCalendar rows={rows.filter(r=>r.recipient_id===selected)} date={calendarDate} mode={calendarMode} onDate={setCalendarDate} onMode={setCalendarMode}/>}
 <div className={styles.heading}><h2>{section==='home'?'Your shared care plan':`${recipient.name}’s records`}</h2>{canAdd&&<button className={styles.primary} onClick={add}>Add {section==='coverage'?'a visit':'a record'}</button>}</div>
 {notice&&<p role="status" className={styles.notice}>{notice}</p>}
 {capture&&admin&&allowed(capture)&&<CaptureRecord key={selected+capture} mode={capture} recipientId={selected} recipientName={recipient.name||'this person'} encryptionKey={keyFor(capture)} onCancel={()=>setCapture(null)} onSave={async(commands:CreateRecord[])=>{await json('/api/records',{type:'batch',commands});setCapture(null);setNotice('Reviewed record saved to the shared care plan.');await refresh();}}/>}
 {form&&<form id="workspace-editor" key={editing?.id||'new'} onSubmit={create} className={styles.card}><h2>{editing?'Revise':'Add to'} {recipient.name}’s care plan</h2>{editing&&<p>Previous instructions stay in history. A revised visit requires the helper to accept again.</p>}<label>Record type<select disabled={!!editing} value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kinds).filter(([k,v])=>!['medication','report'].includes(k)&&allowed(v.category)).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><label>Title<input defaultValue={editing?.content?.title} name="title" maxLength={150} required/></label><label>{kind==='medication'?'Reviewed label directions, dose, route and schedule':kind==='report'?'Reviewed results, units, report date and source':'Instructions and preferences'}<textarea defaultValue={editing?.content?.detail} name="detail" maxLength={8000} required rows={4}/></label>
 <div className={styles.grid}><label>Start · your device timezone<input type="datetime-local" defaultValue={inputDate(editing?.starts_at)} name="start" required={kind==='visit'}/></label><label>End · your device timezone<input type="datetime-local" defaultValue={inputDate(editing?.ends_at)} name="end" required={kind==='visit'}/></label></div>
 <label>Responsible helper<select defaultValue={editing?.assigned_to||''} name="helper" required={kind==='visit'}><option value="">{kind==='visit'?'Choose a helper':'Unassigned'}</option>{members.filter(m=>m.access.some(a=>a.recipientId===selected&&!a.revoked&&(!a.expiresAt||new Date(a.expiresAt)>new Date())&&includesCategory(a,kinds[kind].category))).map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}</select></label>
 <label className={styles.check}><input name="reviewed" type="checkbox" required/>I reviewed these details against the source and confirmed they belong to {recipient.name}.</label>{kind==='medication'&&<p>A saved medication record is reference information. It does not authorize administration or check interactions.</p>}<div className={styles.actions}><button disabled={busy} className={styles.primary}>Save record</button><button type="button" disabled={busy} onClick={()=>setForm(false)}>Cancel</button></div></form>}
 {report&&<form id="workspace-editor" className={styles.card} onSubmit={e=>{e.preventDefault();const note=String(new FormData(e.currentTarget).get('note')).trim();if(note)void action(report,report.kind==='visit'?'complete':'record',note);}}><h2>Record what happened · {report.content?.title}</h2><label>Care update<textarea name="note" maxLength={8000} required rows={3}/></label><button className={styles.primary} disabled={busy}>Save update</button> <button type="button" onClick={()=>setReport(null)}>Cancel</button></form>}
 {!canViewSection(section)&&<p className={styles.notice}>This section is not shared with your account. Your care organizer can review your access.</p>}
 {!visible.length&&!form&&!capture&&canViewSection(section)&&<section className={styles.card}><h3>No records here yet</h3><p>{admin?'Add the first reviewed record to guide your care circle.':'Your organizer can add a care plan here.'}</p></section>}
 <div className={styles.records}>{visible.map(row=><article className={styles.card} id={"record-"+row.id} key={row.id}><div className={styles.heading}><p className={styles.caption}>{categoryNames[row.category]} · {when(row.starts_at)}{row.ends_at?' – '+when(row.ends_at):''}</p><span className={styles.status}>{row.status}</span></div><h3>{row.content?.title}</h3><p className={styles.detail}>{row.content?.detail}</p>{row.content?.medication&&<p className={styles.muted}>Ingredient: {row.content.medication.activeIngredient} · {row.content.medication.scheduleReason}</p>}{row.content?.health&&<details><summary>Reviewed source and results</summary><p>{row.content.health.sourceName} · {row.content.health.collectedDate}</p>{row.content.health.results.map(result=><p key={result.id}>{result.testName}: {result.rawValue} {result.unit} · {result.referenceRange||'No source range'} · {result.flag}</p>)}<pre className={styles.detail}>{row.content.health.rawText}</pre></details>}{row.assigned_to&&<p><strong>{name(row.assigned_to)}</strong> with {recipient.name}</p>}{row.arrived_at&&<p>Arrival reported {when(row.arrived_at)}. This is a helper check-in, not location verification.</p>}
 <div className={styles.actions}>{admin&&!['arrived','completed','canceled'].includes(row.status)&&!['medication','report'].includes(row.kind)&&<button disabled={busy} onClick={()=>{setEditing(row);setKind(row.kind);setForm(true);setReport(null);setCapture(null);}}>Edit plan</button>}{row.kind==='visit'&&row.assigned_to===family?.actorId&&<>{row.status==='requested'&&<><button disabled={busy} onClick={()=>void action(row,'accept')}>Accept visit</button><button disabled={busy} onClick={()=>void action(row,'decline')}>Decline</button></>}{row.status==='accepted'&&<button disabled={busy} onClick={()=>void action(row,'arrive')}>I’m here with {recipient.name}</button>}{row.status==='arrived'&&<button disabled={busy} onClick={()=>{setForm(false);setCapture(null);setReport(row);}}>Complete visit & leave update</button>}</>}{['task','meal','note'].includes(row.kind)&&row.status==='open'&&(!row.assigned_to||row.assigned_to===family?.actorId)&&<button disabled={busy} onClick={()=>{setForm(false);setCapture(null);setReport(row);}}>Record what happened</button>}{admin&&!['completed','canceled'].includes(row.status)&&<button disabled={busy} onClick={()=>void action(row,'cancel')}>Cancel record</button>}</div>
 <details><summary>Activity history</summary>{events.filter(e=>e.record_id===row.id).map(e=><p key={e.id}>{name(e.actor_id)} · {e.action} · {when(e.created_at)}{e.note&&<span className={styles.detail}> — {e.note}</span>}{e.previous&&<span className={styles.detail}> — Previous instructions: {e.previous.title}: {e.previous.detail}</span>}</p>)}</details></article>)}</div>
 </>}
 </>}
 <footer className={styles.footer}><button className={styles.textButton} onClick={()=>navigate('account')}>Device access & encrypted backup</button><br/>Content is encrypted on your device. Timing, assignments and status are shared metadata. <Link href="/demo">Open the separate fictional demo</Link></footer></main></div>;
}









