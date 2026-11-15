// This intentionally has no remote target option.
import { Client } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const config=JSON.parse(await fs.readFile(path.join(root,'.local-services/config.json'),'utf8'));
const db=new Client({host:'127.0.0.1',port:55432,user:'postgres',password:config.pgPassword,database:'postgres'});
await db.connect();
try{
for(const directory of ['people-local-migrations','workspace-local-migrations']) {
 for(const name of (await fs.readdir(path.join(root,'supabase',directory))).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await fs.readFile(path.join(root,'supabase',directory,name),'utf8');const hash=createHash('sha256').update(sql).digest('hex');const r=await db.query('select hash from public.handsin_local_migrations where name=$1',[name]);
  if(r.rows.length){if(r.rows[0].hash!==hash)throw Error('An applied local migration changed: '+name);continue;}
  await db.query(sql);await db.query('insert into public.handsin_local_migrations values($1,$2)',[name,hash]);console.log('Applied locally: '+name);
 }
 }
 await db.query("notify pgrst,'reload schema'");
}finally{await db.end();}

