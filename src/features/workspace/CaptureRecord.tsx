'use client';
import {useEffect,useState,type ChangeEvent} from 'react';
import {emptyMedicationDraft,type MedicationDraft} from '../../../lib/medications/types';
import {parseMedicationLabel} from '../../../lib/medications/parse-label';
import {emptyHealthDraft,type HealthDraft,type LabResult} from '../../../lib/health/types';
import {parseReportText} from '../../../lib/health/parse-report';
import {extractSource} from './extract-source';
import {encodeRecord,localDate,reviewedOccurrences,type CareContent,type CreateRecord} from './records';
import styles from './trial.module.css';

const fields: {key:keyof MedicationDraft;label:string;required?:boolean}[]=[
 {key:'medicationName',label:'Medication name',required:true},{key:'activeIngredient',label:'Active ingredient',required:true},
 {key:'strength',label:'Strength as printed',required:true},{key:'dosageForm',label:'Form / route'},
 {key:'directions',label:'Exact label directions',required:true},{key:'prescriber',label:'Prescriber'},
 {key:'pharmacy',label:'Pharmacy'},{key:'prescriptionNumber',label:'Prescription number'},
];
export default function CaptureRecord({mode,recipientId,recipientName,encryptionKey,onSave,onCancel}:{
 mode:'medications'|'health';recipientId:string;recipientName:string;encryptionKey:string;
 onSave:(commands:CreateRecord[])=>Promise<void>;onCancel:()=>void;
}){
 const [step,setStep]=useState(0),[raw,setRaw]=useState(''),[source,setSource]=useState(''),[preview,setPreview]=useState(''),[sourceType,setSourceType]=useState('');
 const [med,setMed]=useState<MedicationDraft>({...emptyMedicationDraft,recipientId});
 const [health,setHealth]=useState<HealthDraft>({...emptyHealthDraft,recipientId});
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[reviewed,setReviewed]=useState(false);
 const [times,setTimes]=useState(''),[start,setStart]=useState(localDate(new Date())),[schedule,setSchedule]=useState(false);
 const [lastParsedText,setLastParsedText]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const isMedication=mode==='medications';
 async function upload(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;e.target.value='';setBusy(true);setError('');setProgress(0);setSource(file.name);setSourceType(file.type);setPreview(URL.createObjectURL(file));setReviewed(false);setRaw('');setMed({...emptyMedicationDraft,recipientId});setHealth({...emptyHealthDraft,recipientId});setSchedule(false);
  try{const result=await extractSource(file,setProgress);if(result.text.length>12000)throw Error('This source is too long for one record. Split it into shorter reports.');setRaw(result.text);setHealth(h=>({...h,pageCount:result.pages}));}
  catch(e){setError((e as Error).message+' You can still type the source text or enter fields manually.');}finally{setBusy(false);}
 }
 function review(){setReviewed(false);setError('');
  if(isMedication){const current=raw===lastParsedText?med:{...emptyMedicationDraft,recipientId};const parsed=parseMedicationLabel(raw,current);setMed({...parsed,activeIngredient:current.activeIngredient,photos:[]});}
  else {const parsed=parseReportText(raw,raw===lastParsedText?health:{...emptyHealthDraft,recipientId});if(parsed.results.length>20){setError('This source has more than twenty results. Split it into smaller reports before continuing.');return;}setHealth({...parsed,sourceName:source||'Manual reviewed entry',sourceType:sourceType==='application/pdf'?'pdf':sourceType.startsWith('image/')?'image':'',sourceUrl:'',results:parsed.results});}
  setLastParsedText(raw);
  setStep(1);
 }
 function updateResult(id:string,patch:Partial<LabResult>){setHealth(h=>({...h,results:h.results.map(r=>r.id===id?{...r,...patch,review:'needs-review'}:r)}));setReviewed(false);}
 function addResult(){setHealth(h=>({...h,results:[...h.results,{id:crypto.randomUUID(),testName:'',rawValue:'',numericValue:'',comparator:'',qualitativeValue:'',unit:'',referenceRange:'',flag:'not-provided',review:'needs-review',sourceLine:'Manually transcribed'}]}));setReviewed(false);}
 async function save(){setBusy(true);setError('');try{
  if(!reviewed)throw Error('Confirm your review before saving.');
  let content:CareContent;
  if(isMedication){if(fields.some(f=>f.required&&!String(med[f.key]).trim()))throw Error('Complete the medication name, ingredient, strength and exact directions.');
   const {photos:_,...draft}=med;
   const scheduleTimes=schedule&&!med.asNeeded?times.split(',').map(t=>t.trim()):[];
   content={title:med.medicationName,detail:`${med.strength}${med.dosageForm?' · '+med.dosageForm:''}\n${med.directions}`,reviewed:true,medication:{...draft,rawText:raw,acknowledged:true,scheduleTimes,scheduleReason:scheduleTimes.length?`Reviewed seven-day schedule from ${start}, device timezone ${Intl.DateTimeFormat().resolvedOptions().timeZone}`:'No fixed reminders'}};
  }else{
   if(!health.laboratory.trim()||!health.collectedDate.trim())throw Error('Enter the report source and collection date, or explicitly record “not provided”.');
   if(!health.results.length||health.results.some(r=>!r.testName.trim()||!r.rawValue.trim()||r.review!=='confirmed'))throw Error('Review every result, including the name and value.');
   const {sourceUrl:_,...draft}=health;
   content={title:`${health.reportType==='urine'?'Urine':health.reportType==='blood'?'Blood':'Health'} report · ${health.collectedDate}`,detail:`${health.laboratory}\n${health.results.map(r=>`${r.testName}: ${r.rawValue}${r.unit?' '+r.unit:''}${r.referenceRange?' · source range '+r.referenceRange:''}`).join('\n')}`,reviewed:true,health:{...draft,rawText:raw}};
  }
  const first=await encodeRecord(recipientId,mode,isMedication?'medication':'report',content,encryptionKey);
  const commands=[first];
  if(isMedication&&schedule&&!med.asNeeded){for(const date of reviewedOccurrences(start,times.split(',').map(t=>t.trim()))){commands.push(await encodeRecord(recipientId,'medications','medication',{title:med.medicationName+' · reviewed reminder',detail:content.detail,reviewed:true,sourceId:first.id,medicationOccurrence:true},encryptionKey,date));}}
  if(commands.some(c=>c.contentCipher.data.length>32000))throw Error('This record is too large. Split it into smaller reviewed records.');
  await onSave(commands);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section id="workspace-editor" className={styles.capture} aria-label={isMedication?'Medication capture':'Health report capture'}>
  <div className={styles.heading}><div><p className={styles.caption}>FOR {recipientName.toUpperCase()}</p><h2>{isMedication?'Add a medication':'Add a health report'}</h2></div><button className={styles.secondary} disabled={busy} onClick={onCancel}>Close</button></div>
  <ol className={styles.steps}><li aria-current={step===0?'step':undefined}>1. Capture</li><li aria-current={step===1?'step':undefined}>2. Review</li><li aria-current={step===2?'step':undefined}>3. Save</li></ol>
  {error&&<p role="alert" className={styles.notice}>{error}</p>}
  {step===0&&<><h3>Start with the original.</h3><p>Choose a clear image, PDF or text file, or type the source below. Text is read on this device; the source file is not uploaded.</p><label className={styles.upload}>Take a photo<input type="file" accept="image/*" capture="environment" onChange={upload} disabled={busy}/></label><p>On supported phones, Take a photo opens the rear camera. You can also choose a saved file below. Keep the page flat, well lit and fully in frame.</p><label className={styles.upload}>Source file<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={upload} disabled={busy}/></label>{busy&&<p role="status">Reading source… {progress}%</p>}<label>Source text<textarea rows={8} value={raw} maxLength={12000} onChange={e=>setRaw(e.target.value)} disabled={busy}/></label><div className={styles.actions}><button className={styles.primary} disabled={busy} onClick={review}>{raw?'Review extracted fields':'Enter fields manually'}</button></div></>}
  {step===1&&<><p>Compare each field with the original. Missing values stay unresolved until you review them.</p><div className={styles.reviewGrid}><aside className={styles.sourcePanel}><h3>{source||'Manual source'}</h3>{preview&&sourceType.startsWith('image/')&&<img src={preview} alt="Source being reviewed"/>}{preview&&sourceType==='application/pdf'&&<object data={preview} type="application/pdf" aria-label="Original report"><a href={preview} target="_blank" rel="noreferrer">Open original report</a></object>}<pre>{raw||'No source text. Enter the details directly from the original.'}</pre></aside><div>
  {isMedication?<>{fields.map(f=><label key={f.key}>{f.label}{f.required?' *':''}<input value={String(med[f.key])} maxLength={f.key==='directions'?1200:150} onChange={e=>{setMed(m=>({...m,[f.key]:e.target.value,acknowledged:false}));setReviewed(false);}}/></label>)}<label className={styles.check}><input type="checkbox" checked={med.asNeeded} onChange={e=>{setMed(m=>({...m,asNeeded:e.target.checked}));setSchedule(false);setReviewed(false);}}/>As needed, according to reviewed directions</label><p>Strength and directions are separate. A product name is not assumed to be its active ingredient.</p></>:<><label>Report type<select value={health.reportType} onChange={e=>{setHealth(h=>({...h,reportType:e.target.value as HealthDraft['reportType']}));setReviewed(false);}}><option value="blood">Blood</option><option value="urine">Urine</option><option value="other">Other</option></select></label><label>Laboratory / report source<input value={health.laboratory} maxLength={150} onChange={e=>{setHealth(h=>({...h,laboratory:e.target.value}));setReviewed(false);}}/></label><label>Collection date as printed<input value={health.collectedDate} maxLength={60} onChange={e=>{setHealth(h=>({...h,collectedDate:e.target.value}));setReviewed(false);}}/></label><p>Review up to twenty results per record. Leave absent units and ranges blank.</p>{health.results.map((r,i)=><fieldset className={styles.result} key={r.id}><legend>Result {i+1}</legend><label>Test name<input value={r.testName} maxLength={100} onChange={e=>updateResult(r.id,{testName:e.target.value})}/></label><div className={styles.formGrid}><label>Value as printed<input value={r.rawValue} maxLength={100} onChange={e=>updateResult(r.id,{rawValue:e.target.value,numericValue:'',qualitativeValue:'',comparator:''})}/></label><label>Unit<input value={r.unit} maxLength={50} onChange={e=>updateResult(r.id,{unit:e.target.value})}/></label></div><label>Source reference range<input value={r.referenceRange} maxLength={100} onChange={e=>updateResult(r.id,{referenceRange:e.target.value})}/></label><label>Source flag<select value={r.flag} onChange={e=>updateResult(r.id,{flag:e.target.value as LabResult['flag']})}><option value="not-provided">Not provided</option><option value="high">High</option><option value="low">Low</option><option value="in-range">In range as printed</option><option value="abnormal">Abnormal as printed</option></select></label><label className={styles.check}><input type="checkbox" checked={r.review==='confirmed'} onChange={e=>{setHealth(h=>({...h,results:h.results.map(item=>item.id===r.id?{...item,review:e.target.checked?'confirmed':'needs-review'}:item)}));setReviewed(false);}}/>I checked this result against the source</label><button className={styles.textButton} onClick={()=>{setHealth(h=>({...h,results:h.results.filter(item=>item.id!==r.id)}));setReviewed(false);}}>Remove this result</button></fieldset>)}<button className={styles.secondary} disabled={health.results.length>=20} onClick={addResult}>Add a result</button></>}
  </div></div><div className={styles.actions}><button className={styles.secondary} onClick={()=>setStep(0)}>Back to source</button><button className={styles.primary} onClick={()=>{setReviewed(false);setStep(2);}}>Continue to final review</button></div></>}
  {step===2&&<><h3>{isMedication?med.medicationName||'Medication details':`${health.laboratory||'Report'} · ${health.results.length} results`}</h3><p>{isMedication?med.directions:'The original values, units, source ranges and review state will be saved together.'}</p>{isMedication&&!med.asNeeded&&<><label className={styles.check}><input type="checkbox" checked={schedule} onChange={e=>{setSchedule(e.target.checked);setReviewed(false);}}/>Add seven days of reminders using reviewed times</label>{schedule&&<div className={styles.formGrid}><label>First date<input type="date" value={start} onChange={e=>{setStart(e.target.value);setReviewed(false);}}/></label><label>24-hour times, separated by commas<input placeholder="08:00, 20:00" value={times} onChange={e=>{setTimes(e.target.value);setReviewed(false);}}/></label></div>}</>}<p>{isMedication?'No interaction screening has been performed. Reminder times must come from reviewed instructions; HandsIn does not choose a dose or authorize administration.':'HandsIn preserves reviewed report information. It does not diagnose or infer missing units or ranges.'}</p><label className={styles.check}><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I verified these details and the recipient, {recipientName}, against the source.</label><div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={()=>setStep(1)}>Back to review</button><button className={styles.primary} disabled={busy||!reviewed} onClick={()=>void save()}>{busy?'Saving…':'Save to care plan'}</button></div></>}
 </section>;
}



