-- Active recipient access is required to enter a family. Profile survives revocation.
begin;
create or replace function private.hi_member(c uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.hi_verified() and exists(select 1 from public.circle_memberships m join public.recipient_access a on a.membership_id=m.id where m.circle_id=c and m.user_id=auth.uid() and m.revoked_at is null and a.revoked_at is null and (a.expires_at is null or a.expires_at>now())) $$;
create or replace function private.hi_admin(c uuid) returns boolean language sql stable security definer set search_path='' as $$ select private.hi_member(c) and exists(select 1 from public.circle_memberships where circle_id=c and user_id=auth.uid() and role in ('owner','admin') and revoked_at is null) $$;
create or replace function private.hi_view() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if not private.hi_verified() then raise exception 'DEVICE_VERIFICATION_REQUIRED';end if;
 select jsonb_build_object('actorId',u,'profile',(select jsonb_build_object('name',display_name) from public.profiles where id=u),
 'circles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'nameCipher',c.name_cipher,'role',m.role)) from public.care_circles c join public.circle_memberships m on m.circle_id=c.id where m.user_id=u and m.revoked_at is null and private.hi_member(c.id)),'[]'),
 'recipients',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'circleId',r.circle_id,'nameCipher',r.name_cipher,'tier',a.tier,'overrides',a.overrides,'expiresAt',a.expires_at)) from public.care_recipients r join public.recipient_access a on a.recipient_id=r.id join public.circle_memberships m on m.id=a.membership_id where m.user_id=u and private.hi_allowed(r.id,'identity')),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('membershipId',m.id,'userId',m.user_id,'circleId',m.circle_id,'name',pr.display_name,'role',m.role,'access',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'recipientId',a.recipient_id,'tier',a.tier,'overrides',a.overrides,'expiresAt',a.expires_at,'version',a.version,'revoked',a.revoked_at is not null)) from public.recipient_access a where a.membership_id=m.id and private.hi_allowed(a.recipient_id,'identity')),'[]'))) from public.circle_memberships m join public.profiles pr on pr.id=m.user_id where private.hi_member(m.circle_id) and m.revoked_at is null),'[]'),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'circleId',circle_id,'recipientId',recipient_id,'email',email,'tier',tier,'expiresAt',expires_at)) from public.circle_invitations where private.hi_admin(circle_id) and revoked_at is null and accepted_at is null and expires_at>now()),'[]')) into result;
 return result;
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
