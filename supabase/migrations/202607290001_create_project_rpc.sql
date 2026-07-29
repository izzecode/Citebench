begin;

create or replace function public.create_project(
  p_id uuid,
  p_title text,
  p_research_question text default '',
  p_inclusion_criteria text default '',
  p_exclusion_criteria text default ''
)
returns public.projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.projects (
    id,
    owner_id,
    title,
    research_question,
    inclusion_criteria,
    exclusion_criteria
  )
  values (
    p_id,
    auth.uid(),
    p_title,
    p_research_question,
    p_inclusion_criteria,
    p_exclusion_criteria
  )
  returning * into created_project;

  return created_project;
end;
$$;

revoke all on function public.create_project(uuid, text, text, text, text)
  from public;
revoke all on function public.create_project(uuid, text, text, text, text)
  from anon;
grant execute on function public.create_project(uuid, text, text, text, text)
  to authenticated;

commit;
