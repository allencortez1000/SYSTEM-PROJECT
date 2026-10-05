-- =====================================================================
-- Migration: add run_type to payroll_runs
-- Run this once in the Supabase SQL Editor.
-- Safe to run multiple times (uses "if not exists").
-- =====================================================================

alter table payroll_runs add column if not exists run_type text;

-- Keep the existing payroll routes working by defaulting older rows.
update payroll_runs
set run_type = coalesce(run_type, 'PR')
where run_type is null;
