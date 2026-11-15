// Isolated local services only. No commands in this file contact the hosted database.
import EmbeddedPostgres from 'embedded-postgres';
import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, createHmac, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const state = path.join(root, '.local-services');
const tools = process.env.HANDSIN_LOCAL_BIN || path.resolve(root, '../tools/local-services');
await fs.mkdir(state, { recursive: true });
let config;
try { config = JSON.parse(await fs.readFile(path.join(state, 'config.json'), 'utf8')); }
catch { config = { pgPassword: randomBytes(32).toString('hex'), authPassword: randomBytes(32).toString('hex'), restPassword: randomBytes(32).toString('hex'), jwt: randomBytes(48).toString('hex') }; await fs.writeFile(path.join(state, 'config.json'), JSON.stringify(config), { mode: 0o600 }); }
function jwt(role) { const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const payload = Buffer.from(JSON.stringify({ role, iss: 'local-handsin', iat: Math.floor(Date.now()/1000), exp: 2082758400 })).toString('base64url'); return `${header}.${payload}.${createHmac('sha256',config.jwt).update(`${header}.${payload}`).digest('base64url')}`; }
const handles = [];
const logfile = async name => { const handle=await fs.open(path.join(state, `${name}.log`),'a');handles.push(handle);return handle.fd; };
const pgLog = await fs.open(path.join(state, 'postgres.log'), 'a');
const pg = new EmbeddedPostgres({ databaseDir: path.join(state, 'postgres'), user: 'postgres', password: config.pgPassword, port: 55432, authMethod: 'scram-sha-256', persistent: true, autoRehydrateSymlinks: true, postgresFlags: ['-h', '127.0.0.1'], onLog: m => pgLog.write(String(m)), onError: m => pgLog.write(String(m)) });
try { await fs.access(path.join(state,'postgres','PG_VERSION')); } catch { await pg.initialise(); }
await pg.start();
const db = pg.getPgClient('postgres'); await db.connect();
const roles = await db.query("select rolname from pg_roles where rolname in ('supabase_auth_admin','authenticator','authenticated','anon')");
if (!roles.rows.length) await db.query(`create role supabase_auth_admin login noinherit createrole password '${config.authPassword}'; create schema auth authorization supabase_auth_admin; grant create on database postgres to supabase_auth_admin; alter role supabase_auth_admin set search_path=auth; create role authenticated nologin; create role anon nologin; create role service_role nologin bypassrls; create role authenticator login noinherit password '${config.restPassword}'; grant anon,authenticated,service_role to authenticator;`);
const children = [];
async function launch(name, exe, env, args=[]) { const fd = await logfile(name); const child = spawn(exe,args,{ cwd:root, env:{...process.env,Path:path.join(root,'node_modules','@embedded-postgres','windows-x64','native','bin')+';'+(process.env.Path||process.env.PATH||''),...env},windowsHide:true,stdio:['ignore',fd,fd] }); child.on('error',e=>console.error(`${name}: ${e.message}`)); children.push(child); return child; }
const gateway = createServer((req,res) => {
  if(req.url.startsWith('/templates/')) { res.writeHead(200,{'Content-Type':'text/html'}); res.end('<h2>HandsIn</h2><p>Your verification code is <strong>{{ .Token }}</strong></p><p>Only enter this code in HandsIn. It expires shortly.</p>'); return; }
  const auth = req.url.startsWith('/auth/v1/'); const rest = req.url.startsWith('/rest/v1/');
  if(!auth && !rest) { res.writeHead(404);res.end();return; }
  const headers = { ...req.headers, host: `127.0.0.1:${auth?59999:53000}` };
  if(rest && !headers.authorization) headers.authorization = `Bearer ${jwt('anon')}`;
  const upstream=httpRequest({hostname:'127.0.0.1',port:auth?59999:53000,path:req.url.replace(auth?'/auth/v1':'/rest/v1',''),method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(503);res.end('Local service unavailable');});req.pipe(upstream);
});
await new Promise(resolve=>gateway.listen(54321,'127.0.0.1',resolve));
await launch('mailpit',path.join(tools,'mailpit','mailpit.exe'),{MP_SMTP_BIND_ADDR:'127.0.0.1:51025',MP_UI_BIND_ADDR:'127.0.0.1:58025',MP_DATABASE:path.join(state,'mailpit.db')});
await launch('auth',path.join(tools,'auth.exe'),{
  GOTRUE_SITE_URL:'http://127.0.0.1:3000',GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:3000/**',API_EXTERNAL_URL:'http://127.0.0.1:54321/auth/v1',
  GOTRUE_API_HOST:'127.0.0.1',PORT:'59999',GOTRUE_DB_DRIVER:'postgres',DB_NAMESPACE:'auth',DATABASE_URL:`postgres://supabase_auth_admin:${config.authPassword}@127.0.0.1:55432/postgres?sslmode=disable`,
  GOTRUE_JWT_SECRET:config.jwt,GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_ADMIN_ROLES:'service_role',
  GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_PASSWORD_MIN_LENGTH:'12',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'51025',GOTRUE_SMTP_ADMIN_EMAIL:'hello@handsin.test',GOTRUE_SMTP_SENDER_NAME:'HandsIn local',GOTRUE_SMTP_MAX_FREQUENCY:'1s',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_MAILER_OTP_EXP:'600',GOTRUE_MAILER_OTP_LENGTH:'6',
  GOTRUE_MAILER_TEMPLATES_CONFIRMATION:'http://127.0.0.1:54321/templates/confirmation',GOTRUE_MAILER_TEMPLATES_MAGIC_LINK:'http://127.0.0.1:54321/templates/magic',GOTRUE_MAILER_TEMPLATES_RECOVERY:'http://127.0.0.1:54321/templates/recovery',LOG_LEVEL:'warn',GOTRUE_METRICS_ENABLED:'false',GOTRUE_TRACING_ENABLED:'false',
});
async function wait(url) { for(let i=0;i<120;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error(`Local service failed to start: ${url}. See .local-services logs.`); }
await wait('http://127.0.0.1:59999/health');
await db.query(`create or replace function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;`);
await db.query(`create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid(),auth.jwt() to anon,authenticated; create table if not exists public.handsin_local_migrations(name text primary key, hash text not null);`);
const migrationDir=path.join(root,'supabase','people-local-migrations');
for(const name of (await fs.readdir(migrationDir)).filter(n=>n.endsWith('.sql')).sort()) { const sql=await fs.readFile(path.join(migrationDir,name),'utf8');const hash=createHash('sha256').update(sql).digest('hex');const exists=await db.query('select hash from public.handsin_local_migrations where name=$1',[name]);if(exists.rows.length){if(exists.rows[0].hash!==hash)throw Error('Applied local migration was changed: '+name);continue;}await db.query(sql);await db.query('insert into public.handsin_local_migrations values($1,$2)',[name,hash]); }
await launch('postgrest',path.join(tools,'postgrest','postgrest.exe'),{PGRST_DB_URI:`postgres://authenticator:${config.restPassword}@127.0.0.1:55432/postgres`,PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_JWT_SECRET:config.jwt,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:'53000',PGRST_LOG_LEVEL:'warn'});
await wait('http://127.0.0.1:53000/');
const envFile=path.join(root,'.env.local');try{const old=await fs.readFile(envFile,'utf8');if(!old.includes('127.0.0.1:54321'))await fs.writeFile(path.join(state,'hosted-env-backup'),old,{mode:0o600});}catch{}
await fs.writeFile(envFile,`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${jwt('anon')}\nNEXT_PUBLIC_LOCAL_AUTH=true\n`);
console.log('Local services ready. App: http://127.0.0.1:3000/auth · Test inbox: http://127.0.0.1:58025 · PostgreSQL: loopback port 55432. Hosted project untouched.');
async function shutdown(){gateway.close();for(const child of children)child.kill();await db.end();await pg.stop();process.exit(0);}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
await new Promise(()=>{});
