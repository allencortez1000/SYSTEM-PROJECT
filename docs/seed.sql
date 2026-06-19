-- =====================================================================
-- HR & Payroll Management System - Clean Seed Script
-- Safe to run multiple times. It clears existing "Demo Company" sample
-- data and reinserts a fresh, consistent dataset.
-- Run this in the Supabase SQL Editor.
-- =====================================================================

do $$
declare
  v_org   uuid;
  v_admin uuid;

  d_ops uuid; d_eng uuid; d_fin uuid;
  p_ops uuid; p_eng uuid; p_fin uuid;

  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid;

  lt_vl uuid; lt_sl uuid;

  v_run uuid;
begin
  ------------------------------------------------------------------
  -- 1. Find (or create) the Demo Company organization
  ------------------------------------------------------------------
  select id into v_org
  from organizations
  where name = 'Demo Company'
  order by created_at asc
  limit 1;

  if v_org is null then
    insert into organizations (name, legal_name, country, currency)
    values ('Demo Company', 'Demo Company Philippines Inc.', 'Philippines', 'PHP')
    returning id into v_org;
  end if;

  select id into v_admin from app_users where username = 'admin' limit 1;

  ------------------------------------------------------------------
  -- 2. Clear existing Demo Company sample data (child -> parent)
  ------------------------------------------------------------------
  delete from payroll_items
  where payroll_run_id in (
    select id from payroll_runs
    where organization_id in (select id from organizations where name = 'Demo Company')
  );

  delete from payroll_runs
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from leave_requests
  where employee_id in (
    select id from employees
    where organization_id in (select id from organizations where name = 'Demo Company')
  );

  delete from job_openings
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from leave_types
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from compliance_requirements
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from employees
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from job_positions
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from departments
  where organization_id in (select id from organizations where name = 'Demo Company');

  delete from candidates
  where email in (
    'carla.mendoza@example.com',
    'noel.aquino@example.com',
    'liza.reyes@example.com'
  );

  ------------------------------------------------------------------
  -- 3. Departments
  ------------------------------------------------------------------
  insert into departments (organization_id, name, code, description)
  values (v_org, 'Operations', 'OPS', 'Operations and service delivery')
  returning id into d_ops;

  insert into departments (organization_id, name, code, description)
  values (v_org, 'Engineering', 'ENG', 'Product and software engineering')
  returning id into d_eng;

  insert into departments (organization_id, name, code, description)
  values (v_org, 'Finance', 'FIN', 'Finance and accounting')
  returning id into d_fin;

  ------------------------------------------------------------------
  -- 4. Job positions
  ------------------------------------------------------------------
  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_ops, 'Operations Associate', 'Staff')
  returning id into p_ops;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_eng, 'Software Engineer', 'Mid')
  returning id into p_eng;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_fin, 'Accountant', 'Staff')
  returning id into p_fin;

  ------------------------------------------------------------------
  -- 5. Employees (PHP monthly salaries)
  ------------------------------------------------------------------
  insert into employees (organization_id, employee_no, first_name, last_name, email, phone,
                         department_id, position_id, hire_date, status, salary,
                         sss_number, pagibig_number, philhealth_number, tin_number)
  values (v_org, 'EMP-0001', 'Maria', 'Santos', 'maria.santos@democompany.ph', '09170000001',
          d_ops, p_ops, '2023-01-15', 'Active', 32000,
          '34-1234567-8', '1234-5678-9012', '12-345678901-2', '123-456-789-000')
  returning id into e1;

  insert into employees (organization_id, employee_no, first_name, last_name, email, phone,
                         department_id, position_id, hire_date, status, salary,
                         sss_number, pagibig_number, philhealth_number, tin_number)
  values (v_org, 'EMP-0002', 'Juan', 'Dela Cruz', 'juan.delacruz@democompany.ph', '09170000002',
          d_eng, p_eng, '2022-09-01', 'Active', 65000,
          '34-2234567-8', '2234-5678-9012', '22-345678901-2', '223-456-789-000')
  returning id into e2;

  insert into employees (organization_id, employee_no, first_name, last_name, email, phone,
                         department_id, position_id, hire_date, status, salary,
                         sss_number, pagibig_number, philhealth_number, tin_number)
  values (v_org, 'EMP-0003', 'Ana', 'Reyes', 'ana.reyes@democompany.ph', '09170000003',
          d_fin, p_fin, '2024-03-10', 'Active', 38000,
          '34-3234567-8', '3234-5678-9012', '32-345678901-2', '323-456-789-000')
  returning id into e3;

  insert into employees (organization_id, employee_no, first_name, last_name, email, phone,
                         department_id, position_id, hire_date, status, salary)
  values (v_org, 'EMP-0004', 'Carlo', 'Mendoza', 'carlo.mendoza@democompany.ph', '09170000004',
          d_eng, p_eng, '2025-01-06', 'Onboarding', 55000)
  returning id into e4;

  insert into employees (organization_id, employee_no, first_name, last_name, email, phone,
                         department_id, position_id, hire_date, status, salary)
  values (v_org, 'EMP-0005', 'Liza', 'Garcia', 'liza.garcia@democompany.ph', '09170000005',
          d_ops, p_ops, '2021-06-21', 'On Leave', 30000)
  returning id into e5;

  ------------------------------------------------------------------
  -- 6. Leave types + leave requests
  ------------------------------------------------------------------
  insert into leave_types (organization_id, name, code, default_days_per_year, is_paid)
  values (v_org, 'Vacation Leave', 'VL', 15, true)
  returning id into lt_vl;

  insert into leave_types (organization_id, name, code, default_days_per_year, is_paid)
  values (v_org, 'Sick Leave', 'SL', 10, true)
  returning id into lt_sl;

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e5, lt_vl, '2026-06-22', '2026-06-26', 5, 'Family vacation', 'Approved');

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e1, lt_sl, '2026-06-18', '2026-06-19', 2, 'Flu recovery', 'Pending');

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e2, lt_vl, '2026-07-01', '2026-07-03', 3, 'Personal time off', 'Pending');

  ------------------------------------------------------------------
  -- 7. Payroll run + items
  ------------------------------------------------------------------
  insert into payroll_runs (organization_id, run_code, pay_period_start, pay_period_end, payout_date,
                            status, total_gross_pay, total_sss, total_pagibig, total_philhealth,
                            total_other_deductions, total_deductions, total_net_pay, total_employer_cost, notes)
  values (v_org, 'PR-2026-05', '2026-05-01', '2026-05-31', '2026-06-05',
          'Paid', 135000, 4500, 600, 2700, 0, 7800, 127200, 145000, 'May 2026 payroll')
  returning id into v_run;

  insert into payroll_items (payroll_run_id, employee_id, hourly_rate, regular_hours, regular_pay,
                             overtime_hours, overtime_rate, overtime_pay, allowances, bonus, gross_pay,
                             sss_deduction, pagibig_deduction, philhealth_deduction, other_deductions,
                             total_deductions, net_pay, employer_cost)
  values (v_run, e1, 200, 160, 32000, 0, 0, 0, 2000, 0, 34000,
          1200, 100, 640, 0, 1940, 32060, 36000);

  insert into payroll_items (payroll_run_id, employee_id, hourly_rate, regular_hours, regular_pay,
                             overtime_hours, overtime_rate, overtime_pay, allowances, bonus, gross_pay,
                             sss_deduction, pagibig_deduction, philhealth_deduction, other_deductions,
                             total_deductions, net_pay, employer_cost)
  values (v_run, e2, 406, 160, 65000, 5, 507, 2535, 3000, 0, 70535,
          1800, 200, 1300, 0, 3300, 67235, 74000);

  insert into payroll_items (payroll_run_id, employee_id, hourly_rate, regular_hours, regular_pay,
                             overtime_hours, overtime_rate, overtime_pay, allowances, bonus, gross_pay,
                             sss_deduction, pagibig_deduction, philhealth_deduction, other_deductions,
                             total_deductions, net_pay, employer_cost)
  values (v_run, e3, 237, 160, 38000, 0, 0, 0, 1500, 0, 39500,
          1500, 100, 760, 0, 2360, 37140, 41000);

  ------------------------------------------------------------------
  -- 8. Job openings
  ------------------------------------------------------------------
  insert into job_openings (organization_id, department_id, position_id, title, description,
                            employment_type, location, salary_min, salary_max, status, opened_at)
  values (v_org, d_eng, p_eng, 'Senior Software Engineer',
          'Build and maintain core HR systems.', 'Full-time', 'Makati City', 70000, 110000, 'Open', '2026-05-20');

  insert into job_openings (organization_id, department_id, position_id, title, description,
                            employment_type, location, salary_min, salary_max, status, opened_at)
  values (v_org, d_fin, p_fin, 'Payroll Specialist',
          'Run monthly Philippine payroll and statutory filings.', 'Full-time', 'Makati City', 35000, 50000, 'Open', '2026-06-01');

  ------------------------------------------------------------------
  -- 9. Candidates
  ------------------------------------------------------------------
  insert into candidates (first_name, last_name, email, phone, source, notes)
  values ('Carla', 'Mendoza', 'carla.mendoza@example.com', '09180000001', 'LinkedIn', 'Strong React background');

  insert into candidates (first_name, last_name, email, phone, source, notes)
  values ('Noel', 'Aquino', 'noel.aquino@example.com', '09180000002', 'Referral', 'Payroll experience in BPO');

  insert into candidates (first_name, last_name, email, phone, source, notes)
  values ('Liza', 'Reyes', 'liza.reyes@example.com', '09180000003', 'Job board', 'Fresh graduate, accounting');

  ------------------------------------------------------------------
  -- 10. Compliance requirements
  ------------------------------------------------------------------
  insert into compliance_requirements (organization_id, title, description, category, frequency, due_day, is_active)
  values (v_org, 'SSS Remittance', 'Monthly SSS contribution remittance', 'Statutory', 'Monthly', 10, true);

  insert into compliance_requirements (organization_id, title, description, category, frequency, due_day, is_active)
  values (v_org, 'PhilHealth Remittance', 'Monthly PhilHealth contribution remittance', 'Statutory', 'Monthly', 11, true);

  insert into compliance_requirements (organization_id, title, description, category, frequency, due_day, is_active)
  values (v_org, 'BIR 1601-C', 'Monthly withholding tax on compensation', 'Tax', 'Monthly', 10, true);

  ------------------------------------------------------------------
  -- 11. Notification (linked to admin if present)
  ------------------------------------------------------------------
  insert into notifications (organization_id, user_id, title, message, status)
  values (v_org, v_admin, 'Welcome to HR Payroll', 'Sample data has been loaded. Sign in with admin / admin.', 'Unread');

end $$;
