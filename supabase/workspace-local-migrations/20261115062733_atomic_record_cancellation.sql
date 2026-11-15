begin;
create function public.handsin_record_cancel_batch(commands jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb;result jsonb:='[]'::jsonb;
begin
 if jsonb_typeof(commands)<>'array' or jsonb_array_length(commands) not between 1 and 29 then raise exception 'VALIDATION_FAILED';end if;
 for item in select value from jsonb_array_elements(commands) loop
  if item->>'type' is distinct from 'cancel' then raise exception 'VALIDATION_FAILED';end if;
  result:=result||jsonb_build_array(private.record_command(item));
 end loop;
 return result;
end $$;
revoke all on function public.handsin_record_cancel_batch(jsonb) from public,anon;
grant execute on function public.handsin_record_cancel_batch(jsonb) to authenticated;
commit;
