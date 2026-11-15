// Browser-only encryption. No plaintext family names, recipient labels, or raw keys go to the API.
import { categories,includesCategory,type Access,type Category } from './preview-domain';
export interface Cipher {v:1;iv:string;data:string}
export interface RecipientKeys {labelKey:string;categories:Partial<Record<Category,string>>}
export interface FamilyKeys {familyKey:string;recipients:Record<string,RecipientKeys>}
export interface Vault {families:Record<string,FamilyKeys>}
const bytes=(n=32)=>crypto.getRandomValues(new Uint8Array(n));
const b64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const newKey=()=>b64(bytes());
async function aes(raw:string){return crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encrypt(raw:string,value:unknown,context:string):Promise<Cipher>{const iv=bytes(12);const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},await aes(raw),new TextEncoder().encode(JSON.stringify(value)));return {v:1,iv:b64(iv),data:b64(new Uint8Array(data))};}
export async function decrypt<T>(raw:string,cipher:Cipher,context:string):Promise<T>{const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(cipher.iv),additionalData:new TextEncoder().encode(context)},await aes(raw),unb64(cipher.data));return JSON.parse(new TextDecoder().decode(data));}
export async function tokenHash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function newBundle():RecipientKeys{return {labelKey:newKey(),categories:Object.fromEntries(categories.map(c=>[c,newKey()]))};}
export function restrictedBundle(bundle:RecipientKeys,access:Access):RecipientKeys{const allowed=categories.filter(c=>includesCategory(access,c));if(allowed.some(c=>!bundle.categories[c]))throw Error('You do not have the encryption keys needed to grant that access.');return {labelKey:bundle.labelKey,categories:Object.fromEntries(allowed.map(c=>[c,bundle.categories[c]]))};}
async function sessionStore(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest){return new Promise<unknown>((resolve,reject)=>{const open=indexedDB.open('handsin-device-session',1);open.onupgradeneeded=()=>open.result.createObjectStore('keys');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('keys',mode);const req=work(tx.objectStore('keys'));tx.oncomplete=()=>{resolve(req.result);db.close();};tx.onerror=()=>{reject(tx.error);db.close();};};});}
let currentKey:CryptoKey|null=null;let currentUser='';
async function derive(password:string,salt:Uint8Array){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:new Uint8Array(salt),iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function unlockVault(userId:string,password:string){const saved=localStorage.getItem('handsin-vault-'+userId);const salt=saved?unb64(JSON.parse(saved).salt):bytes(16);currentKey=await derive(password,salt);currentUser=userId;if(saved)await loadVault(userId);else await saveVault(userId,{families:{}},salt);await sessionStore('readwrite',s=>s.put(currentKey,userId));}
export async function loadVault(userId:string):Promise<Vault>{if(currentUser!==userId||!currentKey){currentKey=await sessionStore('readonly',s=>s.get(userId)) as CryptoKey;currentUser=userId;}if(!currentKey)throw Error('Unlock this device by signing in again.');const saved=localStorage.getItem('handsin-vault-'+userId);if(!saved)return {families:{}};const c=JSON.parse(saved);const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(c.iv),additionalData:new TextEncoder().encode(userId)},currentKey,unb64(c.data));return JSON.parse(new TextDecoder().decode(data));}
export async function saveVault(userId:string,vault:Vault,salt?:Uint8Array){if(!currentKey||currentUser!==userId)throw Error('Unlock this device by signing in again.');const prior=localStorage.getItem('handsin-vault-'+userId);const storedSalt=salt||unb64(JSON.parse(prior!).salt);const iv=bytes(12);const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(userId)},currentKey,new TextEncoder().encode(JSON.stringify(vault)));localStorage.setItem('handsin-vault-'+userId,JSON.stringify({v:1,salt:b64(storedSalt),iv:b64(iv),data:b64(new Uint8Array(data))}));}
export async function lockVault(userId:string){currentKey=null;currentUser='';await sessionStore('readwrite',s=>s.delete(userId));}

// Export only the password-encrypted vault. Import does not grant server access.
export async function exportDeviceVault(userId:string){
 await loadVault(userId);
 const saved=localStorage.getItem('handsin-vault-'+userId);
 if(!saved)throw Error('There are no device keys to export yet.');
 return JSON.stringify({format:'handsin-device-vault',version:1,userId,vault:JSON.parse(saved)});
}
function validateVault(value:unknown):asserts value is Vault{
 if(!value||typeof value!=='object'||!('families' in value))throw Error('Invalid device file.');
 const families=(value as Vault).families;
 if(!families||typeof families!=='object'||Array.isArray(families)||Object.keys(families).length>200)throw Error('Invalid device file.');
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const checkKey=(key:string)=>{if(typeof key!=='string'||unb64(key).length!==32)throw Error('Invalid encryption key.');};
 for(const [id,family] of Object.entries(families)){
  if(!uuid.test(id)||!family||typeof family!=='object'||!family.recipients||typeof family.recipients!=='object')throw Error('Invalid device file.');
  checkKey(family.familyKey);
  for(const [recipient,bundle] of Object.entries(family.recipients)){
   if(!uuid.test(recipient)||!bundle||!bundle.categories||typeof bundle.categories!=='object')throw Error('Invalid device file.');
   checkKey(bundle.labelKey);
   for(const [category,key] of Object.entries(bundle.categories)){if(!categories.includes(category as Category))throw Error('Invalid key category.');checkKey(key);}
  }
 }
}
export async function importDeviceVault(userId:string,source:string,password:string){
 if(source.length>2000000)throw Error('This device file is too large.');
 const file=JSON.parse(source);
 if(file.format!=='handsin-device-vault'||file.version!==1||file.userId!==userId)throw Error('Sign in to the same account that exported this file.');
 const encrypted=file.vault;
 let imported:Vault;
 try{
  const key=await derive(password,unb64(encrypted.salt));
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(encrypted.iv),additionalData:new TextEncoder().encode(userId)},key,unb64(encrypted.data));
  imported=JSON.parse(new TextDecoder().decode(bytes));validateVault(imported);
 }catch{throw Error('The file could not be unlocked. Check its export-time account password and try again.');}
 const current=await loadVault(userId);
 for(const [circle,family] of Object.entries(imported.families)){
  const existing=current.families[circle];
  if(!existing){current.families[circle]=family;continue;}
  if(existing.familyKey!==family.familyKey)throw Error('This file conflicts with the current family keys. Keep the current device file.');
  for(const [recipient,bundle] of Object.entries(family.recipients)){
   const prior=existing.recipients[recipient];
   if(prior&&prior.labelKey!==bundle.labelKey)throw Error('This file conflicts with current recipient keys.');
   if(prior){for(const category of categories){if(prior.categories[category]&&bundle.categories[category]&&prior.categories[category]!==bundle.categories[category])throw Error('This file contains a conflicting category key.');}prior.categories={...bundle.categories,...prior.categories};}
   else existing.recipients[recipient]=bundle;
  }
 }
 await saveVault(userId,current);
}
