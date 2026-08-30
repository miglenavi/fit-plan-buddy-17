create or replace function public.set_session_exercise_sets(_se_id uuid, _count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _client uuid;
  _trainer uuid;
begin
  if _count is null or _count < 0 or _count > 50 then
    raise exception 'Invalid set count';
  end if;

  select s.client_id, s.trainer_id into _client, _trainer
  from public.session_exercises se
  join public.training_sessions s on s.id = se.session_id
  where se.id = _se_id;

  if _client is null then
    raise exception 'Session exercise not found';
  end if;

  if not (auth.uid() = _client or public.is_trainer_of(auth.uid(), _client) or public.has_role(auth.uid(), 'super_admin')) then
    raise exception 'Not allowed';
  end if;

  update public.session_exercises set target_sets = _count where id = _se_id;
end;
$$;

revoke all on function public.set_session_exercise_sets(uuid, integer) from public;
grant execute on function public.set_session_exercise_sets(uuid, integer) to authenticated;