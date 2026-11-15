begin;
-- Only encrypted content is stored. Routing, assignment, timing and status are metadata.
create table public.care_records (
 id uuid primary key, recipient_id uuid not null references public.care_recipients(id),
 category text not null check(category in ('medications','tasks','meals','care','health')),
 kind text not null check(kind in ('medication','report','visit','task','meal','note')),
 content_cipher jsonb not null, assigned_to uuid references auth.users(id),
 starts_at timestamptz, ends_at timestamptz,
 status text not null default 'open' check(status in ('open','requested','accepted','declined','arrived','completed','canceled')),
 arrived_at timestamptz, version integer not null default 1,
 created_by uuid not null references auth.users(id), updated_at timestamptz not null default now(),
 check(ends_at is null or (starts_at is not null and ends_at>starts_at)),
 check((kind='visit' and category='tasks' and starts_at is not null and ends_at is not null and assigned_to is not null)
 or (kind='medication' and category='medications') or (kind='report' and category='health')
 or (kind='meal' and category='meals') or (kind='note' and category='care') or (kind='task' and category='tasks'))
);
create index care_records_recipient on public.care_records(recipient_id,starts_at);
create table public.care_record_events (
 id uuid primary key, record_id uuid not null references public.care_records(id),
 actor_id uuid not null references auth.users(id), action text not null,
 content_cipher jsonb, created_at timestamptz not null default now(), version integer not null
);
create index care_record_events_record on public.care_record_events(record_id,created_at);
create table private.record_receipts(actor_id uuid not null,operation_id uuid not null, fingerprint bytea not null, result jsonb not null, primary key(actor_id,operation_id));
alter table private.record_receipts enable row level security;
alter table public.care_records enable row level security;
alter table public.care_record_events enable row level security;
revoke all on public.care_records,public.care_record_events from anon,authenticated;
grant select on public.care_records,public.care_record_events to authenticated;
create policy allowed_records on public.care_records for select to authenticated using(private.hi_allowed(recipient_id,category));
create policy allowed_record_events on public.care_record_events for select to authenticated using(exists(select 1 from public.care_records r where r.id=record_id));

create function private.record_cipher_valid(c jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(c)='object' and c->>'v'='1' and length(c->>'iv')=16 and length(c->>'data') between 24 and 32000
 and (c->>'iv') ~ '^[A-Za-z0-9+/]+={0,2}$' and (c->>'data') ~ '^[A-Za-z0-9+/]+={0,2}$'
 and (c - 'v' - 'iv' - 'data')='{}'::jsonb,false)
$$;
create function private.record_command(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); op uuid:=(p->>'operationId')::uuid; rid uuid:=(p->>'id')::uuid;
 r public.care_records; recipient uuid; cat text; circle uuid; action text:=p->>'type'; result jsonb;
 receipt private.record_receipts; fingerprint bytea:=sha256(convert_to(p::text,'UTF8')); admin boolean;
begin
 if u is null or not private.hi_verified() then raise exception 'FORBIDDEN'; end if;
 if op is null or rid is null then raise exception 'VALIDATION_FAILED'; end if;
 -- Serialize retries for the same actor and operation before checking receipt/version.
 perform pg_advisory_xact_lock(hashtextextended(u::text||op::text,0));
 if action='create' then recipient:=(p->>'recipientId')::uuid; cat:=p->>'category';
 else select * into r from public.care_records where id=rid for update;
   if not found then raise exception 'FORBIDDEN'; end if; recipient:=r.recipient_id;cat:=r.category;
 end if;
 if not coalesce(private.hi_allowed(recipient,cat),false) then raise exception 'FORBIDDEN'; end if;
 select circle_id into circle from public.care_recipients where id=recipient;
 admin:=private.hi_admin(circle);
 select * into receipt from private.record_receipts where actor_id=u and operation_id=op;
 if found then
   if receipt.fingerprint<>fingerprint then raise exception 'VERSION_CONFLICT'; end if;
   return receipt.result;
 end if;
 if action='create' then
   if not admin then raise exception 'FORBIDDEN'; end if;
   if not private.record_cipher_valid(p->'contentCipher') then raise exception 'VALIDATION_FAILED'; end if;
   if nullif(p->>'assignedTo','') is not null and not exists (
     select 1 from public.recipient_access a join public.circle_memberships m on m.id=a.membership_id
     where a.recipient_id=recipient and m.user_id=(p->>'assignedTo')::uuid and m.revoked_at is null and a.revoked_at is null
     and (a.expires_at is null or a.expires_at>coalesce((p->>'endsAt')::timestamptz,now()))
     and coalesce((a.overrides->>cat)::boolean,case when cat in ('medications','tasks') then a.tier>=1 when cat in ('meals','care') then a.tier>=2 when cat='health' then a.tier>=3 else false end)
   ) then raise exception 'FORBIDDEN'; end if;
   insert into public.care_records(id,recipient_id,category,kind,content_cipher,assigned_to,starts_at,ends_at,status,created_by)
   values(rid,recipient,cat,p->>'kind',p->'contentCipher',nullif(p->>'assignedTo','')::uuid,(p->>'startsAt')::timestamptz,(p->>'endsAt')::timestamptz,
   case when p->>'kind'='visit' then 'requested' else 'open' end,u) returning * into r;
 else
   if r.version<>(p->>'expectedVersion')::integer or p->>'expectedVersion' is null then raise exception 'VERSION_CONFLICT'; end if;
   if action='cancel' then
     if not admin or r.status in ('completed','canceled') then raise exception 'FORBIDDEN'; end if;
     r.status:='canceled';
   elsif action in ('accept','decline','arrive','complete') then
     if r.kind<>'visit' or r.assigned_to is distinct from u then raise exception 'FORBIDDEN'; end if;
     if action in ('accept','decline') and r.status='requested' and r.ends_at>now() then
       r.status:=case when action='accept' then 'accepted' else 'declined' end;
     elsif action='arrive' and r.status='accepted' and now()>=r.starts_at-interval '30 minutes' and now()<r.ends_at then
       r.status:='arrived';r.arrived_at:=now();
     elsif action='complete' and r.status='arrived' and private.record_cipher_valid(p->'contentCipher') then r.status:='completed';
     else raise exception 'INVALID_TRANSITION'; end if;
   elsif action='record' then
     if r.kind not in ('task','meal','note') or r.status<>'open' or (r.assigned_to is not null and r.assigned_to<>u)
       or not private.record_cipher_valid(p->'contentCipher') then raise exception 'FORBIDDEN'; end if;
     r.status:='completed';
   else raise exception 'VALIDATION_FAILED'; end if;
   update public.care_records set status=r.status,arrived_at=r.arrived_at,version=version+1,updated_at=now() where id=rid returning * into r;
 end if;
 insert into public.care_record_events(id,record_id,actor_id,action,content_cipher,version)
 values(op,rid,u,action,case when action in ('record','complete') then p->'contentCipher' else null end,r.version);
 result:=jsonb_build_object('id',rid,'version',r.version,'status',r.status);
 insert into private.record_receipts values(u,op,fingerprint,result);
 return result;
end $$;
create function public.handsin_record_command(p jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.record_command(p) $$;
revoke all on function private.record_cipher_valid(jsonb),private.record_command(jsonb),public.handsin_record_command(jsonb) from public,anon;
grant execute on function private.record_command(jsonb),public.handsin_record_command(jsonb) to authenticated;
commit;
