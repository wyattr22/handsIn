// Produces a review bundle only. Never connects to or modifies a database.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const output=join(root,'.backend-handoff');
await mkdir(output,{recursive:true});
const manifest=[];
const sections=[];
for(const directory of ['people-local-migrations','workspace-local-migrations']){
 for(const name of (await readdir(join(root,'supabase',directory))).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(join(root,'supabase',directory,name),'utf8');
  manifest.push({path:`supabase/${directory}/${name}`,sha256:createHash('sha256').update(sql).digest('hex')});
  sections.push(`-- SOURCE: supabase/${directory}/${name}\n${sql}`);
 }
}
await writeFile(join(output,'review-only.sql'),'-- For a fresh, dedicated Supabase preview database only. Inspect schema first.\n-- Do not apply over an existing project or run the legacy medication migration.\nBEGIN;\n'+sections.join('\n\n')+'\nCOMMIT;\n');
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${manifest.length} ordered migrations in .backend-handoff. No database was contacted.`);
