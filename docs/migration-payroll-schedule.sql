-- =====================================================================
-- Migration: add pay basis + release schedule columns to payroll_runs
-- Run this once in the Supabase SQL Editor.
-- Safe to run multiple times (uses "if not exists").
-- =====================================================================

alter table payroll_runs add column if not exists pay_basis text;
alter table payroll_runs add column if not exists pay_frequency text;
alter table payroll_runs add column if not exists payout_day text;
alter table payroll_runs add column if not exists second_payout_day text;
alter table payroll_runs add column if not exists pay_period_label text;
