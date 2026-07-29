begin;

revoke all on function public.create_project(uuid, text, text, text, text)
  from anon;

commit;
