'use client';
import { createContext,useContext,useCallback } from 'react';
import { emptyMedicationDraft, type MedicationDraft, type Recipient } from '@/lib/medications/types';
import { useCoverageWorkspace } from '@/src/features/coverage/DemoWorkspace';
import { DEMO_RECIPIENTS } from '@/src/features/coordination/demo/people';
import { authorize } from '@/src/server/domain/coordination/service';
type Value={draft:MedicationDraft;updateDraft:(patch:Partial<MedicationDraft>)=>void;resetDraft:()=>void;hydrated:boolean;recipients:Recipient[];isDemoMode:boolean};
const Context=createContext<Value|null>(null);
export function MedicationFlowProvider({children}:{children:React.ReactNode}){
 const w=useCoverageWorkspace(), recipientId=DEMO_RECIPIENTS.find(p=>p.key===w.selected)!.id, key=`${w.actor}:${recipientId}`;
 const draft=w.medicationDrafts[key] || {...emptyMedicationDraft,recipientId};
 const {setMedicationDrafts,setSelected}=w;
 const updateDraft=useCallback((patch:Partial<MedicationDraft>)=>{
   if(patch.recipientId && patch.recipientId!==recipientId){const p=DEMO_RECIPIENTS.find(p=>p.id===patch.recipientId);if(p)setSelected(p.key);return;}
   setMedicationDrafts(old=>({...old,[key]:{...(old[key]||{...emptyMedicationDraft,recipientId}),...patch,recipientId,acknowledged:Object.keys(patch).some(k=>k!=='acknowledged'&&k!=='recipientId')?false:(patch.acknowledged??old[key]?.acknowledged??false)}}));
 },[key,recipientId,setMedicationDrafts,setSelected]);
 const resetDraft=useCallback(()=>setMedicationDrafts(old=>({...old,[key]:{...emptyMedicationDraft,recipientId}})),[key,recipientId,setMedicationDrafts]);
 const recipients:Recipient[]=DEMO_RECIPIENTS.map(p=>({...p,relationship:'Fictional family profile',routine:{wake:'07:00',breakfast:'08:00',lunch:'12:00',dinner:'18:00',bedtime:'22:00'}}));
 let allowed=true;try{authorize(w.calendar,w.actor,recipientId,'manage',w.now,undefined,'medication');}catch{allowed=false;}
 if(!allowed)return <main><h1>Medication access unavailable</h1><p>Ask the care organizer to review your access.</p><a href="/">Return Home</a></main>;
 return <Context.Provider value={{draft,updateDraft,resetDraft,hydrated:true,recipients,isDemoMode:true}}>{children}</Context.Provider>;
}
export function useMedicationFlow(){const c=useContext(Context);if(!c)throw new Error('Medication workspace missing');return c;}




