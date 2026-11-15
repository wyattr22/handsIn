begin;
alter table public.care_record_events add column previous_cipher jsonb;
create function private.guard_visit_conflict() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='visit' and new.status in ('requested','accepted','arrived') then
  perform pg_advisory_xact_lock(hashtextextended(new.assigned_to::text,1));
  if exists(select 1 from public.care_records r where r.id<>new.id and r.kind='visit' and r.assigned_to=new.assigned_to
    and r.status in ('requested','accepted','arrived') and r.starts_at<new.ends_at and r.ends_at>new.starts_at) then
   raise exception 'SCHEDULE_CONFLICT';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_visit_conflict() from public,anon,authenticated;
create trigger guard_visit_conflict before insert or update on public.care_records for each row execute function private.guard_visit_conflict();
create function private.revise_record(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();op uuid:=(p->>'operationId')::uuid;r public.care_records;c uuid;receipt private.record_receipts;
 fingerprint bytea:=sha256(convert_to(p::text,'UTF8'));result jsonb;
begin
 if u is null or not private.hi_verified() or op is null then raise exception 'FORBIDDEN';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||op::text,0));
 select * into r from public.care_records where id=(p->>'id')::uuid for update;
 if not found or not private.hi_allowed(r.recipient_id,r.category) then raise exception 'FORBIDDEN';end if;
 select circle_id into c from public.care_recipients where id=r.recipient_id;
 if not private.hi_admin(c) then raise exception 'FORBIDDEN';end if;
 select * into receipt from private.record_receipts where actor_id=u and operation_id=op;
 if found then if receipt.fingerprint<>fingerprint then raise exception 'VERSION_CONFLICT';end if;return receipt.result;end if;
 if r.version is distinct from (p->>'expectedVersion')::integer then raise exception 'VERSION_CONFLICT';end if;
 if r.status in ('arrived','completed','canceled') then raise exception 'INVALID_TRANSITION';end if;
 if not private.record_cipher_valid(p->'contentCipher') then raise exception 'VALIDATION_FAILED';end if;
 if nullif(p->>'assignedTo','') is not null and not exists(
  select 1 from public.recipient_access a join public.circle_memberships m on m.id=a.membership_id
  where a.recipient_id=r.recipient_id and m.user_id=(p->>'assignedTo')::uuid and m.revoked_at is null and a.revoked_at is null
   and (a.expires_at is null or a.expires_at>coalesce((p->>'endsAt')::timestamptz,now()))
   and coalesce((a.overrides->>r.category)::boolean,case when r.category in ('medications','tasks') then a.tier>=1 when r.category in ('meals','care') then a.tier>=2 when r.category='health' then a.tier>=3 else false end)
 ) then raise exception 'FORBIDDEN';end if;
 insert into public.care_record_events(id,record_id,actor_id,action,previous_cipher,version) values(op,r.id,u,'revise',r.content_cipher,r.version+1);
 update public.care_records set content_cipher=p->'contentCipher',starts_at=(p->>'startsAt')::timestamptz,ends_at=(p->>'endsAt')::timestamptz,
  assigned_to=nullif(p->>'assignedTo','')::uuid,status=case when kind='visit' then 'requested' else 'open' end,version=version+1,updated_at=now()
 where id=r.id returning jsonb_build_object('id',id,'version',version,'status',status) into result;
 insert into private.record_receipts values(u,op,fingerprint,result);return result;
end $$;
create function public.handsin_record_revision(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.revise_record(p)$$;
revoke all on function private.revise_record(jsonb),public.handsin_record_revision(jsonb) from public,anon;
grant execute on function private.revise_record(jsonb),public.handsin_record_revision(jsonb) to authenticated;
commit;
