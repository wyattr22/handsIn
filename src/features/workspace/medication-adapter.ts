import type { CareWorkspace } from '../../contracts/care';
import type { MedicationDraft } from '../../../lib/medications/types';
import { authorize } from '../../server/domain/coordination/service';
import { localToInstant, parts, addLocalDays } from '../../server/domain/coordination/time';
/** A reviewed demo record and its calendar occurrences commit together. No OCR-derived food rules. */
export function addMedication(w:CareWorkspace,draft:MedicationDraft,id:string,actor:string,now:string):CareWorkspace {
  authorize(w.coordination,actor,draft.recipientId,'manage',now,undefined,'medication');
  if(!draft.medicationName.trim() || !draft.activeIngredient.trim() || !draft.directions.trim() || !draft.acknowledged) throw new Error('Review the product, directions and schedule before saving.');
  const times=draft.asNeeded?[]:draft.scheduleTimes;
  if(times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || new Set(times).size!==times.length) throw new Error('Use distinct 24-hour times, for example 08:00.');
  if(w.guidance.some(g=>g.id===id)) return w;
  const result=structuredClone(w), recipient=result.coordination.recipients.find(r=>r.id===draft.recipientId)!;
  const identity={ingredient:draft.activeIngredient,strength:draft.strength,form:draft.dosageForm,route:'unconfirmed'};
  result.guidance.push({id,recipientId:recipient.id,version:1,product:draft.medicationName,category:draft.productType,status:'needs_review',sourceUrl:'',sourceText:draft.directions,sourceVersion:'User-reviewed demo draft',rule:'unknown',localTimes:times,avoidIngredients:[],instruction:draft.directions,productIdentity:identity,reviewedAt:now});
  const day=parts(now,recipient.timezone).slice(0,10);
  for(let offset=0;offset<7;offset++) for(const time of times){
    const at=addLocalDays(localToInstant(`${day}T${time}`,recipient.timezone),offset,recipient.timezone), occurrenceId=`${id}:${offset}:${time}`;
    (result.medicationOccurrences ||= []).push({id:occurrenceId,medicationId:id,recipientId:recipient.id,guidanceId:id,guidanceVersion:1,version:1,at,timezone:recipient.timezone,status:'needs_review',productIdentity:identity});
    result.coordination.tasks.push({id:`calendar-${occurrenceId}`,circleId:recipient.circleId,recipientId:recipient.id,title:`${draft.medicationName} · reviewed demo schedule`,category:'medication',medicationOccurrenceId:occurrenceId,start:at,end:new Date(Date.parse(at)+15*60000).toISOString(),timezone:recipient.timezone,status:'open',version:1});
  }
  return result;
}

