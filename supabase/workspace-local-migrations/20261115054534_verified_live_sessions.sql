begin;
-- Device proof alone must not outlive the underlying authentication session.
create or replace function private.hi_verified() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from private.trusted_sessions t join auth.sessions s on s.id=t.session_id and s.user_id=t.user_id
  where t.user_id=auth.uid() and t.session_id=(auth.jwt()->>'session_id')::uuid
  and (s.not_after is null or s.not_after>now())
 )
$$;
commit;
