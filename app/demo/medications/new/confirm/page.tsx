'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useMedicationFlow} from '@/components/medication-scanner/MedicationFlowProvider';
import {useCoverageWorkspace} from '@/src/features/coverage/DemoWorkspace';
import {addMedication} from '@/src/features/workspace/medication-adapter';
export default function ConfirmPage(){const {draft,resetDraft,recipients}=useMedicationFlow(),w=useCoverageWorkspace(),router=useRouter(),[error,setError]=useState('');const recipient=recipients.find(p=>p.id===draft.recipientId)!;function save(){try{const id=crypto.randomUUID(),next=addMedication(w.care,draft,id,w.actor,w.now);w.setCare(next);w.setMedications(old=>[...old,{id,draft:structuredClone(draft),savedAt:w.now}]);resetDraft();router.push('/medications/demo');}catch(e){setError(e instanceof Error?e.message:'Could not save.');}}return <section className="flow-page"><div className="flow-title"><p>Final review</p><h1>Save {draft.medicationName||'this medication'} for {recipient.name}?</h1><span>This saves to the shared fictional workspace and creates any reviewed calendar times. Reloading resets the preview.</span></div><article className="medication-ticket"><h2>{draft.medicationName||'Missing medication name'}</h2><p>{draft.strength} · {draft.dosageForm}</p><p>{draft.directions||'Missing directions'}</p><p>{draft.asNeeded?'As needed; no scheduled reminders':draft.scheduleTimes.join(', ')||'No reminders'}</p></article><p>Interaction screening and food instructions remain unconfirmed. Saving is not clinical approval.</p>{error&&<p role="alert">{error}</p>}<div className="flow-actions"><button className="primary-action" onClick={save}>Save to {recipient.name}’s medications</button><Link href="/demo/medications/new/review">Review details</Link></div></section>;}


