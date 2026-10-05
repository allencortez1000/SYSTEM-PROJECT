-- =====================================================================
-- Migration: add payroll audit trail table
-- Run this once in the Supabase SQL Editor.
-- Safe to run multiple times (uses "if not exists").
-- =====================================================================

create table if not exists payroll_run_audit_events (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_at timestamptz not null default now(),
  changed_by_user_id uuid null,
  changed_by_role text null,
  changed_by_name text null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_payroll_run_audit_events_payroll_run_id
  on payroll_run_audit_events(payroll_run_id);

create index if not exists idx_payroll_run_audit_events_changed_at
  on payroll_run_audit_events(changed_at desc);
