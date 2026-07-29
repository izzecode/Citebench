begin;

create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  research_question text not null default '',
  inclusion_criteria text not null default '',
  exclusion_criteria text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviewers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (char_length(trim(email)) > 0),
  role text not null check (role in ('owner', 'reviewer')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index reviewers_project_email_unique
  on public.reviewers (project_id, lower(email));
create unique index reviewers_project_user_unique
  on public.reviewers (project_id, user_id)
  where user_id is not null;
create unique index reviewers_one_owner_per_project
  on public.reviewers (project_id)
  where role = 'owner';

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  abstract text not null default '',
  authors text not null default '',
  publication_year integer check (
    publication_year is null
    or publication_year between 1000 and 9999
  ),
  journal text not null default '',
  doi text not null default '',
  source text not null default 'CSV',
  duplicate_of uuid references public.citations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index citations_project_id_idx on public.citations (project_id);
create index citations_duplicate_of_idx on public.citations (duplicate_of);
create index citations_project_doi_idx
  on public.citations (project_id, lower(doi))
  where doi <> '';

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid not null references public.citations(id) on delete cascade,
  reviewer_id uuid not null references public.reviewers(id) on delete cascade,
  verdict text not null check (verdict in ('include', 'maybe', 'exclude')),
  reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (citation_id, reviewer_id)
);

create index decisions_reviewer_id_idx on public.decisions (reviewer_id);

create table public.final_decisions (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid not null unique references public.citations(id) on delete cascade,
  verdict text not null check (verdict in ('include', 'exclude')),
  rationale text not null check (char_length(trim(rationale)) > 0),
  decided_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger decisions_set_updated_at
before update on public.decisions
for each row execute function public.set_updated_at();

create trigger final_decisions_set_updated_at
before update on public.final_decisions
for each row execute function public.set_updated_at();

create or replace function public.add_project_owner_reviewer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reviewers (
    project_id,
    user_id,
    email,
    role,
    accepted_at
  )
  select
    new.id,
    new.owner_id,
    coalesce(auth.users.email, ''),
    'owner',
    now()
  from auth.users
  where auth.users.id = new.owner_id;

  return new;
end;
$$;

create trigger projects_add_owner_reviewer
after insert on public.projects
for each row execute function public.add_project_owner_reviewer();

create or replace function public.enforce_two_reviewers()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.reviewers
    where project_id = new.project_id
      and id <> new.id
  ) >= 2 then
    raise exception 'A Citebench project supports at most two reviewers';
  end if;

  return new;
end;
$$;

create trigger reviewers_enforce_limit
before insert or update of project_id on public.reviewers
for each row execute function public.enforce_two_reviewers();

create or replace function public.validate_citation_duplicate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  retained_project_id uuid;
begin
  if new.duplicate_of is null then
    return new;
  end if;

  if new.duplicate_of = new.id then
    raise exception 'A citation cannot be its own duplicate';
  end if;

  select project_id
    into retained_project_id
  from public.citations
  where id = new.duplicate_of;

  if retained_project_id is distinct from new.project_id then
    raise exception 'Duplicate citations must belong to the same project';
  end if;

  return new;
end;
$$;

create trigger citations_validate_duplicate
before insert or update of duplicate_of, project_id on public.citations
for each row execute function public.validate_citation_duplicate();

create or replace function public.is_project_owner(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_project_owner(target_project_id)
    or exists (
      select 1
      from public.reviewers
      where project_id = target_project_id
        and user_id = auth.uid()
        and accepted_at is not null
    );
$$;

create or replace function public.can_access_citation(target_citation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.citations
    where id = target_citation_id
      and public.is_project_member(project_id)
  );
$$;

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
  );
$$;

create or replace function public.is_citation_project_owner(
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
    where id = target_citation_id
      and public.is_project_owner(project_id)
  );
$$;

create or replace function public.accept_pending_invites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_count integer;
  signed_in_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  signed_in_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if signed_in_email = '' then
    return 0;
  end if;

  update public.reviewers
  set
    user_id = auth.uid(),
    accepted_at = now()
  where user_id is null
    and lower(email) = signed_in_email;

  get diagnostics accepted_count = row_count;
  return accepted_count;
end;
$$;

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

revoke all on function public.set_updated_at() from public;
revoke all on function public.add_project_owner_reviewer() from public;
revoke all on function public.enforce_two_reviewers() from public;
revoke all on function public.validate_citation_duplicate() from public;
revoke all on function public.is_project_owner(uuid) from public;
revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.can_access_citation(uuid) from public;
revoke all on function public.can_decide_citation(uuid, uuid) from public;
revoke all on function public.is_citation_project_owner(uuid) from public;
revoke all on function public.accept_pending_invites() from public;
revoke all on function public.create_project(uuid, text, text, text, text) from public;
revoke all on function public.create_project(uuid, text, text, text, text) from anon;

grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_access_citation(uuid) to authenticated;
grant execute on function public.can_decide_citation(uuid, uuid) to authenticated;
grant execute on function public.is_citation_project_owner(uuid) to authenticated;
grant execute on function public.accept_pending_invites() to authenticated;
grant execute on function public.create_project(uuid, text, text, text, text)
  to authenticated;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.reviewers to authenticated;
grant select, insert, update, delete on public.citations to authenticated;
grant select, insert, update, delete on public.decisions to authenticated;
grant select, insert, update, delete on public.final_decisions to authenticated;

alter table public.projects enable row level security;
alter table public.reviewers enable row level security;
alter table public.citations enable row level security;
alter table public.decisions enable row level security;
alter table public.final_decisions enable row level security;

create policy "Project members can view projects"
on public.projects for select
to authenticated
using (public.is_project_member(id));

create policy "Users can create their own projects"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update projects"
on public.projects for update
to authenticated
using (public.is_project_owner(id))
with check (owner_id = auth.uid());

create policy "Owners can delete projects"
on public.projects for delete
to authenticated
using (public.is_project_owner(id));

create policy "Project members can view reviewers"
on public.reviewers for select
to authenticated
using (
  public.is_project_member(project_id)
  or (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "Owners can add reviewers"
on public.reviewers for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and role = 'reviewer'
  and user_id is null
);

create policy "Owners can update reviewers"
on public.reviewers for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "Owners can remove reviewers"
on public.reviewers for delete
to authenticated
using (
  public.is_project_owner(project_id)
  and role = 'reviewer'
);

create policy "Project members can view citations"
on public.citations for select
to authenticated
using (public.is_project_member(project_id));

create policy "Owners can add citations"
on public.citations for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy "Owners can update citations"
on public.citations for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy "Owners can delete citations"
on public.citations for delete
to authenticated
using (public.is_project_owner(project_id));

create policy "Project members can view decisions"
on public.decisions for select
to authenticated
using (public.can_access_citation(citation_id));

create policy "Reviewers can add their own decisions"
on public.decisions for insert
to authenticated
with check (public.can_decide_citation(citation_id, reviewer_id));

create policy "Reviewers can update their own decisions"
on public.decisions for update
to authenticated
using (public.can_decide_citation(citation_id, reviewer_id))
with check (public.can_decide_citation(citation_id, reviewer_id));

create policy "Reviewers can delete their own decisions"
on public.decisions for delete
to authenticated
using (public.can_decide_citation(citation_id, reviewer_id));

create policy "Project members can view final decisions"
on public.final_decisions for select
to authenticated
using (public.can_access_citation(citation_id));

create policy "Owners can add final decisions"
on public.final_decisions for insert
to authenticated
with check (
  public.is_citation_project_owner(citation_id)
  and decided_by = auth.uid()
);

create policy "Owners can update final decisions"
on public.final_decisions for update
to authenticated
using (public.is_citation_project_owner(citation_id))
with check (
  public.is_citation_project_owner(citation_id)
  and decided_by = auth.uid()
);

create policy "Owners can delete final decisions"
on public.final_decisions for delete
to authenticated
using (public.is_citation_project_owner(citation_id));

commit;
