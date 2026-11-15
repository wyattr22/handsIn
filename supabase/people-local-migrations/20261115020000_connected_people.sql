-- Local-tested proposal. Do not apply to the shared project before schema coordination/review.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles(id uuid primary key references auth.users(id), display_name text not null check(length(btrim(display_name)) between 1 and 100));
create table public.care_circles(id uuid primary key, name_cipher jsonb not null, owner_id uuid not null references public.profiles(id), created_at timestamptz not null default now());
create table public.circle_memberships(id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.care_circles(id),user_id uuid not null references public.profiles(id),role text not null check(role in ('owner','admin','member')),revoked_at timestamptz,created_at timestamptz not null default now(),unique(circle_id,user_id),unique(circle_id,id));
create table public.care_recipients(id uuid primary key,circle_id uuid not null references public.care_circles(id),name_cipher jsonb not null,unique(circle_id,id));
create table public.recipient_access(id uuid primary key default gen_random_uuid(),circle_id uuid not null,recipient_id uuid not null,membership_id uuid not null,tier integer not null check(tier between 1 and 3),overrides jsonb not null default '{}',expires_at timestamptz,revoked_at timestamptz,version integer not null default 1,foreign key(circle_id,recipient_id) references public.care_recipients(circle_id,id),foreign key(circle_id,membership_id) references public.circle_memberships(circle_id,id),unique(recipient_id,membership_id),check(jsonb_typeof(overrides)='object'));
create table public.circle_invitations(id uuid primary key default gen_random_uuid(),circle_id uuid not null,recipient_id uuid not null,email text not null,token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),tier integer not null check(tier between 1 and 3),overrides jsonb not null default '{}',management_role text not null default 'member' check(management_role in ('admin','member')),key_envelope jsonb not null,issued_by uuid not null references public.profiles(id),expires_at timestamptz not null default now()+interval '7 days',access_expires_at timestamptz,accepted_at timestamptz,accepted_by uuid references public.profiles(id),revoked_at timestamptz,created_at timestamptz not null default now(),foreign key(circle_id,recipient_id) references public.care_recipients(circle_id,id));
create table public.audit_events(id uuid primary key default gen_random_uuid(),circle_id uuid not null references public.care_circles(id),actor_id uuid not null references public.profiles(id),action text not null,target_id uuid,created_at timestamptz not null default now());
-- No private care content, passwords, verification codes, or encryption keys in audit entries.
create table private.trusted_sessions(session_id uuid primary key,user_id uuid not null references auth.users(id),verified_at timestamptz not null default now());
create table private.device_challenges(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),used_at timestamptz);
create table private.trusted_devices(token_hash text primary key,user_id uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '30 days');
create index memberships_user on public.circle_memberships(user_id) where revoked_at is null;
create index recipient_access_member on public.recipient_access(membership_id);
create index invitation_email on public.circle_invitations(email);
create function private.hi_verified() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.trusted_sessions where user_id=auth.uid() and session_id=(auth.jwt()->>'session_id')::uuid) $$;
create function private.hi_member(c uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.hi_verified() and exists(select 1 from public.circle_memberships where circle_id=c and user_id=auth.uid() and revoked_at is null) $$;
create function private.hi_admin(c uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.hi_verified() and exists(select 1 from public.circle_memberships where circle_id=c and user_id=auth.uid() and role in ('owner','admin') and revoked_at is null) $$;
create function private.hi_allowed(r uuid,cat text) returns boolean language sql stable security definer set search_path='' as $$
select private.hi_verified() and exists(select 1 from public.recipient_access a join public.circle_memberships m on m.id=a.membership_id where a.recipient_id=r and m.user_id=auth.uid() and m.revoked_at is null and a.revoked_at is null and (a.expires_at is null or a.expires_at>now()) and (cat='identity' or coalesce((a.overrides->>cat)::boolean,case when cat in ('medications','tasks') then a.tier>=1 when cat in ('meals','care') then a.tier>=2 when cat='health' then a.tier>=3 else false end)))
$$;
create function private.hi_otp() returns boolean language sql stable as $$ select exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) v where v->>'method' in ('otp','email/signup','magiclink')) $$;
create function private.hi_device(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid:=(auth.jwt()->>'session_id')::uuid; challenge uuid; token text:=p->>'deviceHash'; kind text:=p->>'type';
begin
 if u is null or sid is null then raise exception 'UNAUTHENTICATED'; end if;
 if kind='begin' then
   if not exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') v where v->>'method'='password' and (v->>'timestamp')::bigint>extract(epoch from now()-interval '5 minutes')) then raise exception 'FORBIDDEN'; end if;
   if exists(select 1 from private.trusted_devices where token_hash=token and user_id=u and expires_at>now()) then insert into private.trusted_sessions values(sid,u,now()) on conflict do nothing;return jsonb_build_object('trusted',true);end if;
   insert into private.device_challenges(user_id) values(u) returning id into challenge;
   return jsonb_build_object('trusted',false,'challenge',challenge);
 elsif kind='registration' then
   if not private.hi_otp() or exists(select 1 from public.profiles where id=u) or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and created_at>now()-interval '30 minutes') then raise exception 'FORBIDDEN';end if;
 elsif kind='finish' then
   if not private.hi_otp() then raise exception 'FORBIDDEN';end if;
   update private.device_challenges set used_at=now() where id=(p->>'challenge')::uuid and user_id=u and used_at is null and created_at>now()-interval '10 minutes' returning id into challenge;
   if challenge is null then raise exception 'FORBIDDEN';end if;
 else raise exception 'VALIDATION_FAILED';end if;
 if token !~ '^[a-f0-9]{64}$' then raise exception 'VALIDATION_FAILED';end if;
 insert into private.trusted_sessions values(sid,u,now()) on conflict do nothing;
 insert into private.trusted_devices(token_hash,user_id) values(token,u) on conflict(token_hash) do update set expires_at=now()+interval '30 days' where private.trusted_devices.user_id=u;
 insert into public.profiles(id,display_name) select u,left(coalesce(nullif(btrim(raw_user_meta_data->>'display_name'),''),'Family member'),100) from auth.users where id=u on conflict do nothing;
 return jsonb_build_object('trusted',true);
end $$;
create function public.handsin_device(p jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.hi_device(p) $$;

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.circle_memberships enable row level security;
alter table public.care_recipients enable row level security;
alter table public.recipient_access enable row level security;
alter table public.circle_invitations enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.profiles,public.care_circles,public.circle_memberships,public.care_recipients,public.recipient_access,public.circle_invitations,public.audit_events from anon,authenticated;
grant select on public.profiles,public.care_circles,public.circle_memberships,public.care_recipients,public.recipient_access,public.audit_events to authenticated;
create policy self_profile on public.profiles for select to authenticated using(id=auth.uid() and private.hi_verified());
create policy own_circles on public.care_circles for select to authenticated using(private.hi_member(id));
create policy own_members on public.circle_memberships for select to authenticated using(private.hi_member(circle_id) and revoked_at is null);
create policy own_recipients on public.care_recipients for select to authenticated using(private.hi_allowed(id,'identity'));
create policy own_grants on public.recipient_access for select to authenticated using(private.hi_admin(circle_id) or (private.hi_allowed(recipient_id,'identity') and membership_id in(select id from public.circle_memberships where user_id=auth.uid())));
create policy admin_audit on public.audit_events for select to authenticated using(private.hi_admin(circle_id));

create function private.hi_command(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); kind text:=p->>'type'; c uuid; r uuid; m uuid; target uuid; invitation public.circle_invitations; a public.recipient_access; issuer public.recipient_access; cat text; ok boolean;
begin
 if not private.hi_verified() then raise exception 'DEVICE_VERIFICATION_REQUIRED';end if;
 perform pg_advisory_xact_lock(724002);
 if kind='createFamily' then
  c:=(p->>'circleId')::uuid;r:=(p->>'recipientId')::uuid;
  if jsonb_typeof(p->'nameCipher')<>'object' or jsonb_typeof(p->'recipientCipher')<>'object' then raise exception 'VALIDATION_FAILED';end if;
  insert into public.care_circles values(c,p->'nameCipher',u,now());
  insert into public.circle_memberships(circle_id,user_id,role) values(c,u,'owner') returning id into m;
  insert into public.care_recipients values(r,c,p->'recipientCipher');
  insert into public.recipient_access(circle_id,recipient_id,membership_id,tier) values(c,r,m,3) returning id into target;
 elsif kind='invite' then
  r:=(p->>'recipientId')::uuid;select circle_id into c from public.care_recipients where id=r;
  if not private.hi_admin(c) or not private.hi_allowed(r,'identity') then raise exception 'FORBIDDEN';end if;
  if p->>'email' not like '%_@_%._%' or length(p->>'email')>254 or (p->>'accessExpiresAt')::timestamptz<=now() then raise exception 'VALIDATION_FAILED';end if;
  for cat in select unnest(array['medications','tasks','meals','care','health']) loop
    ok:=coalesce((p->'overrides'->>cat)::boolean,case when cat in ('medications','tasks') then (p->>'tier')::int>=1 when cat in ('meals','care') then (p->>'tier')::int>=2 else (p->>'tier')::int>=3 end);
    if ok and not private.hi_allowed(r,cat) then raise exception 'FORBIDDEN';end if;
  end loop;
  select aa.* into issuer from public.recipient_access aa join public.circle_memberships mm on mm.id=aa.membership_id where aa.recipient_id=r and mm.user_id=u;
  if issuer.expires_at is not null and (p->>'accessExpiresAt' is null or (p->>'accessExpiresAt')::timestamptz>issuer.expires_at) then raise exception 'FORBIDDEN';end if;
  insert into public.circle_invitations(circle_id,recipient_id,email,token_hash,tier,overrides,management_role,key_envelope,issued_by,access_expires_at) values(c,r,lower(p->>'email'),p->>'tokenHash',(p->>'tier')::int,coalesce(p->'overrides','{}'),coalesce(p->>'managementRole','member'),p->'keyEnvelope',u,(p->>'accessExpiresAt')::timestamptz) returning id into target;
 elsif kind in ('inspectInvite','acceptInvite') then
  select * into invitation from public.circle_invitations where token_hash=p->>'tokenHash' for update;
  if not found or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now() or invitation.access_expires_at<=now() or invitation.email<>lower(auth.jwt()->>'email') then raise exception 'INVITATION_UNAVAILABLE';end if;
  c:=invitation.circle_id;r:=invitation.recipient_id;
  if not exists(select 1 from public.circle_memberships where circle_id=c and user_id=invitation.issued_by and role in ('owner','admin') and revoked_at is null) then raise exception 'INVITATION_UNAVAILABLE';end if;
  select aa.* into issuer from public.recipient_access aa join public.circle_memberships mm on mm.id=aa.membership_id where aa.recipient_id=r and mm.user_id=invitation.issued_by and aa.revoked_at is null and (aa.expires_at is null or aa.expires_at>now());
  if not found or (issuer.expires_at is not null and (invitation.access_expires_at is null or invitation.access_expires_at>issuer.expires_at)) then raise exception 'INVITATION_UNAVAILABLE';end if;
  for cat in select unnest(array['medications','tasks','meals','care','health']) loop
    if coalesce((invitation.overrides->>cat)::boolean,case when cat in ('medications','tasks') then invitation.tier>=1 when cat in ('meals','care') then invitation.tier>=2 else invitation.tier>=3 end) and not coalesce((issuer.overrides->>cat)::boolean,case when cat in ('medications','tasks') then issuer.tier>=1 when cat in ('meals','care') then issuer.tier>=2 else issuer.tier>=3 end) then raise exception 'INVITATION_UNAVAILABLE';end if;
  end loop;
  if kind='inspectInvite' then return jsonb_build_object('circleId',c,'recipientId',r,'tier',invitation.tier,'overrides',invitation.overrides,'keyEnvelope',invitation.key_envelope,'accessExpiresAt',invitation.access_expires_at);end if;
  insert into public.circle_memberships(circle_id,user_id,role) values(c,u,invitation.management_role) on conflict(circle_id,user_id) do update set revoked_at=null returning id into m;
  if exists(select 1 from public.recipient_access where recipient_id=r and membership_id=m and revoked_at is null and (expires_at is null or expires_at>now())) then raise exception 'INVITATION_UNAVAILABLE';end if;
  insert into public.recipient_access(circle_id,recipient_id,membership_id,tier,overrides,expires_at) values(c,r,m,invitation.tier,invitation.overrides,invitation.access_expires_at) on conflict(recipient_id,membership_id) do update set tier=excluded.tier,overrides=excluded.overrides,expires_at=excluded.expires_at,revoked_at=null,version=public.recipient_access.version+1 returning id into target;
  update public.circle_invitations set accepted_at=now(),accepted_by=u where id=invitation.id;
 elsif kind='revokeAccess' then
  select * into a from public.recipient_access where id=(p->>'accessId')::uuid for update;c:=a.circle_id;r:=a.recipient_id;
  if not private.hi_admin(c) or not private.hi_allowed(r,'identity') then raise exception 'FORBIDDEN';end if;
  if a.version<>(p->>'expectedVersion')::int then raise exception 'VERSION_CONFLICT';end if;
  if exists(select 1 from public.circle_memberships where id=a.membership_id and role='owner') then raise exception 'FORBIDDEN: owner transfer required';end if;
  update public.recipient_access set revoked_at=now(),version=version+1 where id=a.id;target:=a.id;
 elsif kind='revokeInvite' then
  select * into invitation from public.circle_invitations where id=(p->>'invitationId')::uuid;c:=invitation.circle_id;
  if not private.hi_admin(c) then raise exception 'FORBIDDEN';end if;
  update public.circle_invitations set revoked_at=now() where id=invitation.id;target:=invitation.id;
 else raise exception 'VALIDATION_FAILED';end if;
 insert into public.audit_events(circle_id,actor_id,action,target_id) values(c,u,kind,target);
 return jsonb_build_object('id',target,'circleId',c,'recipientId',r);
end $$;
create function public.handsin_command(p jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.hi_command(p) $$;
create function private.hi_view() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if not private.hi_verified() then raise exception 'DEVICE_VERIFICATION_REQUIRED';end if;
 select jsonb_build_object('actorId',u,'profile',(select jsonb_build_object('name',display_name) from public.profiles where id=u),
 'circles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nameCipher',c.name_cipher,'role',m.role)) from public.care_circles c join public.circle_memberships m on m.circle_id=c.id where m.user_id=u and m.revoked_at is null),'[]'),
 'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'circleId',r.circle_id,'nameCipher',r.name_cipher,'tier',a.tier,'overrides',a.overrides,'expiresAt',a.expires_at)) from public.care_recipients r join public.recipient_access a on a.recipient_id=r.id join public.circle_memberships m on m.id=a.membership_id where m.user_id=u and private.hi_allowed(r.id,'identity')),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('membershipId',m.id,'userId',m.user_id,'circleId',m.circle_id,'name',pr.display_name,'role',m.role,'access',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'recipientId',a.recipient_id,'tier',a.tier,'overrides',a.overrides,'expiresAt',a.expires_at,'version',a.version,'revoked',a.revoked_at is not null)) from public.recipient_access a where a.membership_id=m.id and private.hi_allowed(a.recipient_id,'identity')),'[]'))) from public.circle_memberships m join public.profiles pr on pr.id=m.user_id where private.hi_member(m.circle_id) and m.revoked_at is null),'[]'),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'circleId',circle_id,'recipientId',recipient_id,'email',email,'tier',tier,'expiresAt',expires_at)) from public.circle_invitations where private.hi_admin(circle_id) and revoked_at is null and accepted_at is null and expires_at>now()),'[]')) into result;
 return result;
end $$;
create function public.handsin_view() returns jsonb language sql stable security invoker set search_path='' as $$ select private.hi_view() $$;
revoke all on all functions in schema private from public;
revoke all on function public.handsin_device(jsonb),public.handsin_command(jsonb),public.handsin_view() from public;
grant execute on function private.hi_verified(),private.hi_member(uuid),private.hi_admin(uuid),private.hi_allowed(uuid,text),private.hi_device(jsonb),private.hi_command(jsonb),private.hi_view(),public.handsin_device(jsonb),public.handsin_command(jsonb),public.handsin_view() to authenticated;
comment on column public.care_circles.name_cipher is 'Client AES-GCM encrypted; server receives no plaintext name or key.';
comment on column public.circle_invitations.key_envelope is 'Client encrypted to random fragment secret. Only SHA-256(secret) is sent to the API.';
commit;
