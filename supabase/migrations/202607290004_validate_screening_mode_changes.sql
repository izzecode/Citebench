begin;

create or replace function public.validate_screening_mode_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.screening_mode = old.screening_mode then
    return new;
  end if;

  if new.screening_mode = 'solo' and exists (
    select 1
    from public.reviewers
    where project_id = new.id
      and role <> 'owner'
  ) then
    raise exception 'Remove invited team members before switching to Solo';
  end if;

  if new.screening_mode = 'dual' and exists (
    select 1
    from public.reviewers
    where project_id = new.id
      and role = 'adjudicator'
  ) then
    raise exception 'Remove the adjudicator before switching to Dual independent';
  end if;

  return new;
end;
$$;

create trigger projects_validate_screening_mode
before update of screening_mode on public.projects
for each row execute function public.validate_screening_mode_change();

revoke all on function public.validate_screening_mode_change() from public;
revoke all on function public.validate_screening_mode_change() from anon;

commit;
