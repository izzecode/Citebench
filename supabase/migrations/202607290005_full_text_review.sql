begin;

create table public.full_text_documents (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid not null unique references public.citations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null default 'application/pdf'
    check (mime_type = 'application/pdf'),
  size_bytes bigint not null
    check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.full_text_decisions (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid not null references public.citations(id) on delete cascade,
  reviewer_id uuid not null references public.reviewers(id) on delete cascade,
  verdict text not null check (verdict in ('include', 'exclude')),
  exclusion_reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (citation_id, reviewer_id),
  check (
    (verdict = 'include' and exclusion_reason = '')
    or
    (verdict = 'exclude' and length(trim(exclusion_reason)) > 0)
  )
);

create table public.full_text_final_decisions (
  id uuid primary key default gen_random_uuid(),
  citation_id uuid not null unique references public.citations(id) on delete cascade,
  verdict text not null check (verdict in ('include', 'exclude')),
  rationale text not null check (length(trim(rationale)) > 0),
  decided_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger full_text_documents_set_updated_at
before update on public.full_text_documents
for each row execute function public.set_updated_at();

create trigger full_text_decisions_set_updated_at
before update on public.full_text_decisions
for each row execute function public.set_updated_at();

create trigger full_text_final_decisions_set_updated_at
before update on public.full_text_final_decisions
for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.full_text_documents to authenticated;
grant select, insert, update, delete on public.full_text_decisions to authenticated;
grant select, insert, update, delete on public.full_text_final_decisions to authenticated;

alter table public.full_text_documents enable row level security;
alter table public.full_text_decisions enable row level security;
alter table public.full_text_final_decisions enable row level security;

create policy "Project members can view full text documents"
on public.full_text_documents for select
to authenticated
using (public.can_access_citation(citation_id));

create policy "Project members can add full text documents"
on public.full_text_documents for insert
to authenticated
with check (
  public.can_access_citation(citation_id)
  and uploaded_by = auth.uid()
);

create policy "Project members can update full text documents"
on public.full_text_documents for update
to authenticated
using (public.can_access_citation(citation_id))
with check (
  public.can_access_citation(citation_id)
  and uploaded_by = auth.uid()
);

create policy "Project members can delete full text documents"
on public.full_text_documents for delete
to authenticated
using (public.can_access_citation(citation_id));

create policy "Project members can view full text decisions"
on public.full_text_decisions for select
to authenticated
using (public.can_access_citation(citation_id));

create policy "Reviewers can add their full text decisions"
on public.full_text_decisions for insert
to authenticated
with check (public.can_decide_citation(citation_id, reviewer_id));

create policy "Reviewers can update their full text decisions"
on public.full_text_decisions for update
to authenticated
using (public.can_decide_citation(citation_id, reviewer_id))
with check (public.can_decide_citation(citation_id, reviewer_id));

create policy "Reviewers can delete their full text decisions"
on public.full_text_decisions for delete
to authenticated
using (public.can_decide_citation(citation_id, reviewer_id));

create policy "Project members can view full text final decisions"
on public.full_text_final_decisions for select
to authenticated
using (public.can_access_citation(citation_id));

create policy "Resolvers can add full text final decisions"
on public.full_text_final_decisions for insert
to authenticated
with check (
  public.can_resolve_citation(citation_id)
  and decided_by = auth.uid()
);

create policy "Resolvers can update full text final decisions"
on public.full_text_final_decisions for update
to authenticated
using (public.can_resolve_citation(citation_id))
with check (
  public.can_resolve_citation(citation_id)
  and decided_by = auth.uid()
);

create policy "Resolvers can delete full text final decisions"
on public.full_text_final_decisions for delete
to authenticated
using (public.can_resolve_citation(citation_id));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'citebench-full-text',
  'citebench-full-text',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_full_text_object(
  object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_project_id uuid;
begin
  target_project_id := ((storage.foldername(object_name))[1])::uuid;
  return public.is_project_member(target_project_id);
exception
  when others then
    return false;
end;
$$;

revoke all on function public.can_access_full_text_object(text) from public;
revoke all on function public.can_access_full_text_object(text) from anon;
grant execute on function public.can_access_full_text_object(text) to authenticated;

create policy "Project members can view full text files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'citebench-full-text'
  and public.can_access_full_text_object(name)
);

create policy "Project members can upload full text files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'citebench-full-text'
  and public.can_access_full_text_object(name)
);

create policy "Project members can replace full text files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'citebench-full-text'
  and public.can_access_full_text_object(name)
)
with check (
  bucket_id = 'citebench-full-text'
  and public.can_access_full_text_object(name)
);

create policy "Project members can delete full text files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'citebench-full-text'
  and public.can_access_full_text_object(name)
);

commit;
