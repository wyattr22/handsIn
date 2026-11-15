-- A trusted device still needs a recent email proof to join a new family.
begin;
create or replace function private.hi_device(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid:=(auth.jwt()->>'session_id')::uuid; challenge uuid; token text:=p->>'deviceHash'; kind text:=p->>'type';
begin
 if u is null or sid is null then raise exception 'UNAUTHENTICATED'; end if;
 if kind='logout' then
   delete from private.trusted_sessions where session_id=sid and user_id=u;return jsonb_build_object('trusted',false);
 elsif kind='begin' then
   if not exists(select 1 from jsonb_array_elements(auth.jwt()->'amr') v where v->>'method'='password' and (v->>'timestamp')::bigint>extract(epoch from now()-interval '5 minutes')) then raise exception 'FORBIDDEN'; end if;
   if coalesce((p->>'requireEmail')::boolean,false)=false and exists(select 1 from private.trusted_devices where token_hash=token and user_id=u and expires_at>now()) then insert into private.trusted_sessions values(sid,u,now()) on conflict do nothing;return jsonb_build_object('trusted',true);end if;
   insert into private.device_challenges(user_id) values(u) returning id into challenge;
   return jsonb_build_object('trusted',false,'challenge',challenge);
 elsif kind='registration' then
   if not private.hi_otp() or exists(select 1 from public.profiles where id=u) or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and encrypted_password<>'' and encrypted_password is not null and created_at>now()-interval '30 minutes') then raise exception 'FORBIDDEN';end if;
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
create or replace function private.hi_command(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if not found or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now() or invitation.access_expires_at<=now() or invitation.email<>(select lower(email) from auth.users where id=u and email_confirmed_at is not null) then raise exception 'INVITATION_UNAVAILABLE';end if;
  c:=invitation.circle_id;r:=invitation.recipient_id;
  if not exists(select 1 from public.circle_memberships where circle_id=c and user_id=invitation.issued_by and role in ('owner','admin') and revoked_at is null) then raise exception 'INVITATION_UNAVAILABLE';end if;
  select aa.* into issuer from public.recipient_access aa join public.circle_memberships mm on mm.id=aa.membership_id where aa.recipient_id=r and mm.user_id=invitation.issued_by and aa.revoked_at is null and (aa.expires_at is null or aa.expires_at>now());
  if not found or (issuer.expires_at is not null and (invitation.access_expires_at is null or invitation.access_expires_at>issuer.expires_at)) then raise exception 'INVITATION_UNAVAILABLE';end if;
  for cat in select unnest(array['medications','tasks','meals','care','health']) loop
    if coalesce((invitation.overrides->>cat)::boolean,case when cat in ('medications','tasks') then invitation.tier>=1 when cat in ('meals','care') then invitation.tier>=2 else invitation.tier>=3 end) and not coalesce((issuer.overrides->>cat)::boolean,case when cat in ('medications','tasks') then issuer.tier>=1 when cat in ('meals','care') then issuer.tier>=2 else issuer.tier>=3 end) then raise exception 'INVITATION_UNAVAILABLE';end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) v where v->>'method' in ('otp','email/signup','magiclink') and (v->>'timestamp')::bigint>extract(epoch from now()-interval '10 minutes')) then raise exception 'EMAIL_VERIFICATION_REQUIRED';end if;
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
commit;
