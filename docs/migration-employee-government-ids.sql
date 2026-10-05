-- =====================================================================
-- Migration: add government ID numbers to employees
-- Run this once in the Supabase SQL Editor.
-- Safe to run multiple times (uses "if not exists").
-- =====================================================================

alter table employees add column if not exists sss_no text;
alter table employees add column if not exists tin_no text;
alter table employees add column if not exists philhealth_no text;
alter table employees add column if not exists pagibig_no text;
