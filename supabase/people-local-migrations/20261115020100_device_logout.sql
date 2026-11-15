-- Forward-only local session revocation.
begin;
create or replace function private.hi_device(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid:=(auth.jwt()->>'session_id')::uuid; challenge uuid; token text:=p->>'deviceHash'; kind text:=p->>'type';
begin
 if u is null or sid is null then raise exception 'UNAUTHENTICATED'; end if;
 if kind='logout' then
   delete from private.trusted_sessions where session_id=sid and user_id=u;return jsonb_build_object('trusted',false);
 elsif kind='begin' then
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
commit;
