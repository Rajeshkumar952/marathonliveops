-- Marathon LiveOps — Supabase production foundation
-- Run in a NEW Supabase project SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  event_date date,
  venue text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  liveops_user_id text unique not null,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','ops','client')),
  department text,
  zone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);

-- The Premium V3 UI persists two realtime snapshots:
-- internal = full Admin/Ops operational state
-- client   = sanitized client-safe state only
create table if not exists public.project_snapshots (
  project_id uuid not null references public.projects(id) on delete cascade,
  audience text not null check (audience in ('internal','client')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key(project_id,audience)
);

create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  name text not null,
  contact text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_snapshot()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

drop trigger if exists trg_touch_snapshot on public.project_snapshots;
create trigger trg_touch_snapshot before insert or update on public.project_snapshots
for each row execute function public.touch_snapshot();

-- Helper predicates used by Row Level Security.
create or replace function public.liveops_role(p_project uuid)
returns text language sql stable security definer set search_path=public as $$
  select role from public.project_memberships
  where project_id=p_project and user_id=auth.uid() and is_active=true
  limit 1
$$;

alter table public.projects enable row level security;
alter table public.profiles enable row level security;
alter table public.project_memberships enable row level security;
alter table public.project_snapshots enable row level security;
alter table public.enquiries enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users can read/update themselves. Admin provisioning should happen server-side.
create policy "profile read self" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profile update self" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

-- Project metadata is visible only to active project members.
create policy "project member read" on public.projects for select to authenticated
using (exists(select 1 from public.project_memberships m where m.project_id=id and m.user_id=auth.uid() and m.is_active));

create policy "membership read own" on public.project_memberships for select to authenticated
using (user_id=auth.uid());

-- Internal snapshots are readable/writable only by Admin/Ops.
create policy "internal snapshot read" on public.project_snapshots for select to authenticated
using (audience='internal' and public.liveops_role(project_id) in ('admin','ops'));
create policy "internal snapshot insert" on public.project_snapshots for insert to authenticated
with check (audience='internal' and public.liveops_role(project_id) in ('admin','ops'));
create policy "internal snapshot update" on public.project_snapshots for update to authenticated
using (audience='internal' and public.liveops_role(project_id) in ('admin','ops'))
with check (audience='internal' and public.liveops_role(project_id) in ('admin','ops'));

-- Client snapshots contain ONLY sanitized fields and are visible to all project roles.
create policy "client snapshot read" on public.project_snapshots for select to authenticated
using (audience='client' and public.liveops_role(project_id) in ('admin','ops','client'));
create policy "client snapshot internal write" on public.project_snapshots for insert to authenticated
with check (audience='client' and public.liveops_role(project_id) in ('admin','ops'));
create policy "client snapshot internal update" on public.project_snapshots for update to authenticated
using (audience='client' and public.liveops_role(project_id) in ('admin','ops'))
with check (audience='client' and public.liveops_role(project_id) in ('admin','ops'));

-- Public landing-page enquiries can be submitted anonymously; only Admins should read them.
create policy "public enquiry insert" on public.enquiries for insert to anon, authenticated with check (true);

create policy "admin audit read" on public.audit_logs for select to authenticated
using (public.liveops_role(project_id)='admin');
create policy "member audit insert" on public.audit_logs for insert to authenticated
with check (public.liveops_role(project_id) in ('admin','ops','client'));

-- Realtime publication (safe to rerun after checking existing publication membership).
alter table public.project_snapshots replica identity full;

-- Storage bucket. Set this bucket to PRIVATE in Supabase dashboard.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('proofs','proofs',false,10485760,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict(id) do update set public=false;

-- Object path convention: PROJECT_UUID/TASK_ID/FILENAME
create policy "project members upload proof" on storage.objects for insert to authenticated
with check (
  bucket_id='proofs' and
  public.liveops_role(((storage.foldername(name))[1])::uuid) in ('admin','ops')
);
create policy "internal proof read" on storage.objects for select to authenticated
using (
  bucket_id='proofs' and
  public.liveops_role(((storage.foldername(name))[1])::uuid) in ('admin','ops')
);

-- IMPORTANT: do not make proof files public in production.
-- Use signed URLs for client-approved proof. Premium V3 demo adapter can be switched
-- to signed URLs after Supabase is connected.
