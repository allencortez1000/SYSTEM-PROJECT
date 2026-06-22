-- =====================================================================
-- Attendance projects, deployment, and overtime migration
-- Run this in the Supabase SQL Editor before using the upgraded
-- attendance module.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.project_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_project_deployments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_site_id uuid not null references public.project_sites(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists employee_project_active_unique
  on public.employee_project_deployments (employee_id)
  where is_active = true;

create index if not exists employee_project_deployments_project_active_idx
  on public.employee_project_deployments (project_site_id, is_active, assigned_at desc);

alter table public.attendance_records
  add column if not exists project_site text,
  add column if not exists period_mode text,
  add column if not exists worked_hours numeric(10,2),
  add column if not exists overtime_hours numeric(10,2),
  add column if not exists overtime_mode text;

create unique index if not exists attendance_records_employee_date_unique
  on public.attendance_records (employee_id, attendance_date);

create index if not exists attendance_records_project_date_idx
  on public.attendance_records (project_site, attendance_date);

insert into public.project_sites (organization_id, name, is_active)
select o.id, site_name, true
from public.organizations o
cross join (
  values ('Daan Pari'), ('Bagac'), ('Orion')
) as sites(site_name)
where o.name = 'Demo Company'
on conflict (name) do nothing;

create or replace function public.set_updated_at_project_sites()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_sites_updated_at on public.project_sites;
create trigger trg_project_sites_updated_at
before update on public.project_sites
for each row
execute function public.set_updated_at_project_sites();

create table if not exists public.payroll_attendance_overrides (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_site text not null,
  period_start date not null,
  period_end date not null,
  paid_days_override numeric(10,2),
  overtime_hours_override numeric(10,2),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, project_site, period_start, period_end)
);

create index if not exists payroll_attendance_overrides_project_period_idx
  on public.payroll_attendance_overrides (project_site, period_start, period_end);

drop trigger if exists trg_payroll_attendance_overrides_updated_at on public.payroll_attendance_overrides;
create trigger trg_payroll_attendance_overrides_updated_at
before update on public.payroll_attendance_overrides
for each row
execute function public.set_updated_at_project_sites();
