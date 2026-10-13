-- Hourbase initial schema
-- Multi-user SaaS: every user-owned row carries user_id and is protected by RLS.
-- Ownership across tables is enforced with composite foreign keys
-- (child.parent_id, child.user_id) -> parent(id, user_id), so a user can never
-- attach their entry to someone else's project, even with a forged request.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users) — preferences live here
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null default '' check (char_length(display_name) <= 80),
  currency            text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  time_zone           text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  week_starts_on      smallint not null default 1 check (week_starts_on in (0, 1, 6)),
  date_format         text not null default 'MMM d, yyyy'
                      check (date_format in ('MMM d, yyyy', 'd MMM yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd')),
  time_format         text not null default '24h' check (time_format in ('24h', '12h')),
  default_hourly_rate numeric(12, 2) check (default_hourly_rate is null or default_hourly_rate >= 0),
  theme               text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  contact_name  text check (contact_name is null or char_length(contact_name) <= 120),
  email         text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website       text check (website is null or char_length(website) <= 300),
  notes         text check (notes is null or char_length(notes) <= 2000),
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id)
);

create index clients_user_idx on public.clients (user_id, archived, name);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id        uuid,
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  description      text check (description is null or char_length(description) <= 1000),
  color            text not null default '#8B79C6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  status           text not null default 'active' check (status in ('active', 'completed', 'archived')),
  start_date       date,
  deadline         date,
  budget_type      text not null default 'hourly' check (budget_type in ('hourly', 'fixed')),
  fixed_fee        numeric(12, 2) check (fixed_fee is null or fixed_fee >= 0),
  hourly_rate      numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  estimated_hours  numeric(8, 2) check (estimated_hours is null or estimated_hours >= 0),
  currency         text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  notes            text check (notes is null or char_length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  -- Client must belong to the same user. NULL client = internal project.
  -- RESTRICT: deleting a client never silently removes projects or history.
  foreign key (client_id, user_id) references public.clients (id, user_id) on delete restrict,
  check (deadline is null or start_date is null or deadline >= start_date),
  check (budget_type <> 'fixed' or (fixed_fee is not null and fixed_fee > 0))
);

create index projects_user_idx on public.projects (user_id, status);
create index projects_client_idx on public.projects (client_id);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- time_entries (completed sessions)
-- ---------------------------------------------------------------------------

create table public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id       uuid not null,
  description      text not null default '' check (char_length(description) <= 300),
  notes            text check (notes is null or char_length(notes) <= 2000),
  billable         boolean not null default true,
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  -- Paused / break time inside [started_at, ended_at].
  break_seconds    integer not null default 0 check (break_seconds >= 0),
  -- Derived (not duplicated state): tracked time = span - breaks. Stored so
  -- reports can aggregate in SQL without recomputing.
  duration_seconds integer generated always as
                   ((extract(epoch from (ended_at - started_at)))::integer - break_seconds) stored,
  source           text not null default 'manual' check (source in ('timer', 'manual')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict,
  check (ended_at > started_at),
  check (break_seconds < extract(epoch from (ended_at - started_at)))
);

create index time_entries_user_started_idx on public.time_entries (user_id, started_at desc);
create index time_entries_project_idx on public.time_entries (project_id, started_at desc);
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- active_timers (at most one per user — enforced by UNIQUE(user_id))
-- ---------------------------------------------------------------------------

create table public.active_timers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() unique references auth.users (id) on delete cascade,
  project_id          uuid not null,
  description         text not null default '' check (char_length(description) <= 300),
  notes               text check (notes is null or char_length(notes) <= 2000),
  billable            boolean not null default true,
  started_at          timestamptz not null,
  status              text not null check (status in ('running', 'paused')),
  accumulated_ms      bigint not null default 0 check (accumulated_ms >= 0),
  segment_started_at  timestamptz,
  paused_at           timestamptz,
  updated_at          timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict,
  check (
    (status = 'running' and segment_started_at is not null and paused_at is null) or
    (status = 'paused'  and segment_started_at is null     and paused_at is not null)
  )
);

create trigger active_timers_updated_at before update on public.active_timers
  for each row execute function public.set_updated_at();

-- Stop a timer and save it as an entry in ONE transaction, so a timer can
-- never be both saved twice and still running. SECURITY INVOKER: RLS applies.
create or replace function public.finish_timer(
  p_timer_id      uuid,
  p_project_id    uuid,
  p_description   text,
  p_notes         text,
  p_billable      boolean,
  p_started_at    timestamptz,
  p_ended_at      timestamptz,
  p_break_seconds integer
)
returns public.time_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry public.time_entries;
begin
  delete from public.active_timers
   where id = p_timer_id and user_id = auth.uid();
  if not found then
    raise exception 'TIMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.time_entries
    (user_id, project_id, description, notes, billable, started_at, ended_at, break_seconds, source)
  values
    (auth.uid(), p_project_id, coalesce(p_description, ''), p_notes, p_billable, p_started_at, p_ended_at, p_break_seconds, 'timer')
  returning * into v_entry;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — users can only see and change their own rows
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.clients       enable row level security;
alter table public.projects      enable row level security;
alter table public.time_entries  enable row level security;
alter table public.active_timers enable row level security;

create policy "profiles: read own"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'time_entries', 'active_timers'] loop
    execute format('create policy "%1$s: select own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: insert own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: update own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s: delete own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

grant execute on function public.finish_timer(uuid, uuid, text, text, boolean, timestamptz, timestamptz, integer) to authenticated;
revoke execute on function public.finish_timer(uuid, uuid, text, text, boolean, timestamptz, timestamptz, integer) from anon, public;
