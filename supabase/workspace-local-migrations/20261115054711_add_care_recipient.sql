begin;
create function private.add_care_recipient(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid:=(p->>'circleId')::uuid;r uuid:=(p->>'recipientId')::uuid;m uuid;
begin
 if u is null or not private.hi_admin(c) then raise exception 'FORBIDDEN';end if;
 if r is null or not private.record_cipher_valid(p->'recipientCipher') then raise exception 'VALIDATION_FAILED';end if;
 select id into m from public.circle_memberships where circle_id=c and user_id=u and revoked_at is null;
 insert into public.care_recipients(id,circle_id,name_cipher) values(r,c,p->'recipientCipher');
 insert into public.recipient_access(circle_id,recipient_id,membership_id,tier) values(c,r,m,3);
 insert into public.audit_events(circle_id,actor_id,action,target_id) values(c,u,'recipient_added',r);
 return jsonb_build_object('id',r);
end $$;
create function public.handsin_add_recipient(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.add_care_recipient(p)$$;
revoke all on function private.add_care_recipient(jsonb),public.handsin_add_recipient(jsonb) from public,anon;
grant execute on function private.add_care_recipient(jsonb),public.handsin_add_recipient(jsonb) to authenticated;
commit;
