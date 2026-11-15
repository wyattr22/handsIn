'use client';
import { createContext,useContext,useCallback } from 'react';
import { emptyHealthDraft,type HealthDraft,type HealthRecipient } from '@/lib/health/types';
import { useCoverageWorkspace } from '@/src/features/coverage/DemoWorkspace';
import { DEMO_RECIPIENTS } from '@/src/features/coordination/demo/people';
import { authorize } from '@/src/server/domain/coordination/service';
type Value={draft:HealthDraft;updateDraft:(patch:Partial<HealthDraft>)=>void;resetDraft:()=>void;hydrated:boolean;recipients:HealthRecipient[];isDemoMode:boolean};
const Context=createContext<Value|null>(null);
export function HealthFlowProvider({children}:{children:React.ReactNode}){
 const w=useCoverageWorkspace(),recipientId=DEMO_RECIPIENTS.find(p=>p.key===w.selected)!.id,key=`${w.actor}:${recipientId}`;
 const draft=w.healthDrafts[key]||{...emptyHealthDraft,recipientId};const {setHealthDrafts,setSelected}=w;
 const updateDraft=useCallback((patch:Partial<HealthDraft>)=>{
  if(patch.recipientId&&patch.recipientId!==recipientId){const p=DEMO_RECIPIENTS.find(p=>p.id===patch.recipientId);if(p)setSelected(p.key);return;}
  setHealthDrafts(old=>({...old,[key]:{...(old[key]||{...emptyHealthDraft,recipientId}),...patch,recipientId}}));
 },[key,recipientId,setHealthDrafts,setSelected]);
 const resetDraft=useCallback(()=>setHealthDrafts(old=>({...old,[key]:{...emptyHealthDraft,recipientId}})),[key,recipientId,setHealthDrafts]);
 const recipients=DEMO_RECIPIENTS.map(p=>({...p,relationship:'Fictional family profile'}));
 let allowed=true;try{authorize(w.calendar,w.actor,recipientId,'manage',w.now,undefined,'health');}catch{allowed=false;}
 if(!allowed)return <main><h1>Health record access unavailable</h1><p>Ask the care organizer to review your access.</p><a href="/">Return Home</a></main>;
 return <Context.Provider value={{draft,updateDraft,resetDraft,hydrated:true,recipients,isDemoMode:true}}>{children}</Context.Provider>;
}
export function useHealthFlow(){const c=useContext(Context);if(!c)throw new Error('Health workspace missing');return c;}



