-- =====================================================================
-- Migration: add salary basis to employees
-- Run this once in the Supabase SQL Editor.
-- =====================================================================

alter table employees
  add column if not exists salary_basis text default 'monthly';
