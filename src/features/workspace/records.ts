import type {Category} from '../people/preview-domain';
import {encrypt,type Cipher} from '../people/vault';
import type {MedicationDraft} from '../../../lib/medications/types';
import type {HealthDraft} from '../../../lib/health/types';

export interface CareContent {
 title:string;detail:string;reviewed:boolean;
 medication?:Omit<MedicationDraft,'photos'>;
 health?:Omit<HealthDraft,'sourceUrl'>;
 sourceId?:string;medicationOccurrence?:boolean;
}
export interface CareRecord {
 id:string;recipient_id:string;category:Category;kind:string;content_cipher:Cipher;
 assigned_to:string|null;starts_at:string|null;ends_at:string|null;
 status:string;arrived_at:string|null;version:number;content?:CareContent;
}
export const recordContext=(r:{id:string;recipient_id:string;category:Category})=>`record:${r.recipient_id}:${r.category}:${r.id}`;
export interface CreateRecord {
 type:'create';id:string;operationId:string;recipientId:string;category:Category;kind:string;
 contentCipher:Cipher;assignedTo:string|null;startsAt:string|null;endsAt:string|null;
}
export async function encodeRecord(recipientId:string,category:Category,kind:string,content:CareContent,key:string,startsAt:string|null=null):Promise<CreateRecord>{
 const id=crypto.randomUUID();
 return {type:'create',id,operationId:crypto.randomUUID(),recipientId,category,kind,
  contentCipher:await encrypt(key,content,recordContext({id,recipient_id:recipientId,category})),
  assignedTo:null,startsAt,endsAt:null};
}
export function localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function reviewedOccurrences(start:string,times:string[],days=7){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||times.length<1||times.length>4||new Set(times).size!==times.length||times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Choose a start date and one to four different 24-hour times.');
 if(localDate(new Date(start+'T12:00:00'))!==start||!Number.isInteger(days)||days<1||days>7)throw Error('Choose a valid date and a schedule of up to seven days.');
 const dates:string[]=[];
 for(let day=0;day<days;day++)for(const time of times){
  const date=new Date(start+'T12:00:00');date.setDate(date.getDate()+day);
  const stamp=localDate(date)+'T'+time+':00';const occurrence=new Date(stamp);
  // Reject nonexistent local times at a daylight-saving jump rather than shifting a dose.
  if(!Number.isFinite(occurrence.getTime())||occurrence.getHours()!==Number(time.slice(0,2))||occurrence.getMinutes()!==Number(time.slice(3)))throw Error('A selected local time does not exist on this date. Review the schedule.');
  dates.push(occurrence.toISOString());
 }
 return dates;
}
