-- =========================================================
-- Atajo Creativo · T5T · schema inicial
-- Pegá TODO esto en Supabase -> SQL Editor -> New query -> Run
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id            uuid primary key default gen_random_uuid(),
  person_id     text not null,
  person_name   text not null,
  week_id       text not null,
  week_label    text not null,
  q1            text default '',
  q2            text default '',
  q3            text default '',
  q4            text default '',
  q5            text default '',
  submitted     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (person_id, week_id)
);

create index if not exists entries_week_id_idx on public.entries (week_id);
create index if not exists entries_person_id_idx on public.entries (person_id);

-- Mantener updated_at al día en cada update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- =========================================================
-- Seguridad: RLS activado, SIN políticas públicas.
-- Todo el acceso pasa por las API routes de Next usando la
-- service_role key (que ignora RLS). El cliente anónimo NO
-- puede leer ni escribir directamente. Eso es intencional.
-- =========================================================
alter table public.entries enable row level security;
