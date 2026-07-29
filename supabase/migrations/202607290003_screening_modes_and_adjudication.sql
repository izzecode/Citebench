begin;

alter table public.projects
add column screening_mode text not null default 'dual';

alter table public.projects
add constraint projects_screening_mode_check
check (screening_mode in ('solo', 'dual', 'dual_adjudicated'));

alter table public.reviewers
drop constraint reviewers_role_check;

alter table public.reviewers
add constraint reviewers_role_check
check (role in ('owner', 'reviewer', 'adjudicator'));

create unique index reviewers_one_reviewer_per_project
  on public.reviewers (project_id)
  where role = 'reviewer';

create unique index reviewers_one_adjudicator_per_project
  on public.reviewers (project_id)
  where role = 'adjudicator';

drop trigger reviewers_enforce_limit on public.reviewers;
drop function public.enforce_two_reviewers();

create or replace function public.enforce_review_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_mode text;
  team_limit integer;
begin
  select screening_mode
    into selected_mode
  from public.projects
  where id = new.project_id;

  if selected_mode is null then
    raise exception 'Project review workflow could not be found';
  end if;

  if selected_mode = 'solo' and new.role <> 'owner' then
    raise exception 'Solo review does not support invited team members';
  end if;

  if selected_mode = 'dual' and new.role = 'adjudicator' then
    raise exception 'Dual independent review does not support an adjudicator';
  end if;

  team_limit := case
    when selected_mode = 'solo' then 1
    when selected_mode = 'dual' then 2
    else 3
  end;

  if (
    select count(*)
    from public.reviewers
    where project_id = new.project_id
      and id <> new.id
  ) >= team_limit then
    raise exception 'This review team is full';
  end if;

  return new;
end;
$$;

create trigger reviewers_enforce_team
before insert or update of project_id, role on public.reviewers
for each row execute function public.enforce_review_team();

create or replace function public.can_decide_citation(
  target_citation_id uuid,
  target_reviewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.citations
    join public.reviewers
      on reviewers.project_id = citations.project_id
    where citations.id = target_citation_id
      and reviewers.id = target_reviewer_id
      and reviewers.user_id = auth.uid()
      and reviewers.accepted_at is not null
      and reviewers.role in ('owner', 'reviewer')
  );
$$;

create or replace function public.can_resolve_citation(
  target_citation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.citations
    join public.projects on projects.id = citations.project_id
    where citations.id = target_citation_id
      and (
        projects.owner_id = auth.uid()
        or exists (
          select 1
          from public.reviewers
          where reviewers.project_id = projects.id
            and reviewers.user_id = auth.uid()
            and reviewers.role = 'adjudicator'
            and reviewers.accepted_at is not null
        )
      )
  );
$$;

drop function public.create_project(uuid, text, text, text, text);

create or replace function public.create_project(
  p_id uuid,
  p_title text,
  p_research_question text default '',
  p_inclusion_criteria text default '',
  p_exclusion_criteria text default '',
  p_screening_mode text default 'dual'
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

  if p_screening_mode not in ('solo', 'dual', 'dual_adjudicated') then
    raise exception 'Unsupported review workflow';
  end if;

  insert into public.projects (
    id,
    owner_id,
    title,
    research_question,
    inclusion_criteria,
    exclusion_criteria,
    screening_mode
  )
  values (
    p_id,
    auth.uid(),
    p_title,
    p_research_question,
    p_inclusion_criteria,
    p_exclusion_criteria,
    p_screening_mode
  )
  returning * into created_project;

  return created_project;
end;
$$;

revoke all on function public.enforce_review_team() from public;
revoke all on function public.enforce_review_team() from anon;
revoke all on function public.can_resolve_citation(uuid) from public;
revoke all on function public.can_resolve_citation(uuid) from anon;
revoke all on function public.create_project(uuid, text, text, text, text, text)
  from public;
revoke all on function public.create_project(uuid, text, text, text, text, text)
  from anon;

grant execute on function public.can_resolve_citation(uuid) to authenticated;
grant execute on function public.create_project(uuid, text, text, text, text, text)
  to authenticated;

drop policy "Owners can add reviewers" on public.reviewers;
create policy "Owners can add reviewers"
on public.reviewers for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and role in ('reviewer', 'adjudicator')
  and user_id is null
);

drop policy "Owners can remove reviewers" on public.reviewers;
create policy "Owners can remove reviewers"
on public.reviewers for delete
to authenticated
using (
  public.is_project_owner(project_id)
  and role in ('reviewer', 'adjudicator')
);

drop policy "Owners can add final decisions" on public.final_decisions;
create policy "Resolvers can add final decisions"
on public.final_decisions for insert
to authenticated
with check (
  public.can_resolve_citation(citation_id)
  and decided_by = auth.uid()
);

drop policy "Owners can update final decisions" on public.final_decisions;
create policy "Resolvers can update final decisions"
on public.final_decisions for update
to authenticated
using (public.can_resolve_citation(citation_id))
with check (
  public.can_resolve_citation(citation_id)
  and decided_by = auth.uid()
);

drop policy "Owners can delete final decisions" on public.final_decisions;
create policy "Resolvers can delete final decisions"
on public.final_decisions for delete
to authenticated
using (public.can_resolve_citation(citation_id));

commit;
