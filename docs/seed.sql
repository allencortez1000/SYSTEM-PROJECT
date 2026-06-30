-- =====================================================================
-- HR & Payroll Management System - Full Demo Seed Script
--
-- Purpose
-- - Loads a consistent Demo Company dataset across the whole system
-- - Keeps employees, attendance, payroll, leave, recruitment, compliance,
--   project deployment, and admin-access data in sync
-- - Safe to run multiple times for the Demo Company tenant
--
-- Run in Supabase SQL Editor.
-- =====================================================================

do $$
declare
  v_org uuid;
  v_admin uuid;
  v_admin_hash text;

  d_ops uuid;
  d_eng uuid;
  d_fin uuid;
  d_hr uuid;

  p_ops_lead uuid;
  p_ops_staff uuid;
  p_eng_mid uuid;
  p_eng_senior uuid;
  p_fin_staff uuid;
  p_hr_staff uuid;

  e1 uuid;
  e2 uuid;
  e3 uuid;
  e4 uuid;
  e5 uuid;
  e6 uuid;

  lt_vl uuid;
  lt_sl uuid;

  ps_daan uuid;
  ps_bagac uuid;
  ps_orion uuid;
  ps_hq uuid;

  run_may uuid;
  run_jun uuid;

  u_eng_head uuid;
  u_ops_head uuid;
begin
  ------------------------------------------------------------------
  -- 1. Find or create Demo Company organization
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

  ------------------------------------------------------------------
  -- 2. Ensure default super admin exists and capture its password hash
  --    The backend also self-heals this account on login.
  ------------------------------------------------------------------
  select id, password
      into v_admin, v_admin_hash
    from app_users
  where username = 'admin'
  limit 1;

  if v_admin is null then
    insert into app_users (
      organization_id,
      full_name,
      email,
      username,
      password,
      role,
      is_active
    )
    values (
      v_org,
      'System Administrator',
      'admin@hrpayroll.local',
      'admin',
      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      'super-admin',
      true
    )
    returning id, password into v_admin, v_admin_hash;
  end if;

  ------------------------------------------------------------------
  -- 3. Clear existing Demo Company data (child -> parent)
  ------------------------------------------------------------------
  delete from payroll_attendance_overrides
  where employee_id in (
    select id from employees where organization_id = v_org
  );

  delete from attendance_records
  where employee_id in (
    select id from employees where organization_id = v_org
  );

  delete from employee_project_deployments
  where employee_id in (
    select id from employees where organization_id = v_org
  );

  delete from payroll_items
  where payroll_run_id in (
    select id from payroll_runs where organization_id = v_org
  );

  delete from payroll_runs
  where organization_id = v_org;

  delete from leave_requests
  where employee_id in (
    select id from employees where organization_id = v_org
  );

  delete from notifications
  where organization_id = v_org;

  delete from compliance_requirements
  where organization_id = v_org;

  delete from employee_project_deployments
  where project_site_id in (
    select id from project_sites where organization_id = v_org
  );

  delete from project_sites
  where organization_id = v_org;

  delete from job_openings
  where organization_id = v_org;

  delete from app_user_departments
  where user_id in (
    select id from app_users where organization_id = v_org and username in ('eng.head', 'ops.head')
  );

  delete from app_users
  where organization_id = v_org and username in ('eng.head', 'ops.head');

  delete from leave_types
  where organization_id = v_org;

  delete from employees
  where organization_id = v_org;

  delete from job_positions
  where organization_id = v_org;

  delete from departments
  where organization_id = v_org;

  delete from candidates
  where email in (
    'carla.mendoza@example.com',
    'noel.aquino@example.com',
    'liza.reyes@example.com',
    'mark.evangelista@example.com'
  );

  ------------------------------------------------------------------
  -- 4. Departments
  ------------------------------------------------------------------
  insert into departments (organization_id, name, code, description)
  values (v_org, 'Operations', 'OPS', 'Operations and field delivery')
  returning id into d_ops;

  insert into departments (organization_id, name, code, description)
  values (v_org, 'Engineering', 'ENG', 'Engineering and systems delivery')
  returning id into d_eng;

  insert into departments (organization_id, name, code, description)
  values (v_org, 'Finance', 'FIN', 'Finance, payroll, and accounting')
  returning id into d_fin;

  insert into departments (organization_id, name, code, description)
  values (v_org, 'Human Resources', 'HR', 'People operations and compliance support')
  returning id into d_hr;

  ------------------------------------------------------------------
  -- 5. Job positions
  ------------------------------------------------------------------
  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_ops, 'Site Supervisor', 'Lead')
  returning id into p_ops_lead;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_ops, 'Operations Associate', 'Staff')
  returning id into p_ops_staff;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_eng, 'Software Engineer', 'Mid')
  returning id into p_eng_mid;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_eng, 'Senior Software Engineer', 'Senior')
  returning id into p_eng_senior;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_fin, 'Payroll Accountant', 'Staff')
  returning id into p_fin_staff;

  insert into job_positions (organization_id, department_id, title, level)
  values (v_org, d_hr, 'HR Generalist', 'Staff')
  returning id into p_hr_staff;

  ------------------------------------------------------------------
  -- 6. Employees
  ------------------------------------------------------------------
  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary,
    sss_number, pagibig_number, philhealth_number, tin_number
  )
  values (
    v_org, 'EMP-0001', 'Maria', 'Santos', 'maria.santos@democompany.ph', '09170000001',
    d_ops, p_ops_staff, '2023-01-15', 'Active', 32000,
    '34-1234567-8', '1234-5678-9012', '12-345678901-2', '123-456-789-000'
  )
  returning id into e1;

  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary,
    sss_number, pagibig_number, philhealth_number, tin_number
  )
  values (
    v_org, 'EMP-0002', 'Juan', 'Dela Cruz', 'juan.delacruz@democompany.ph', '09170000002',
    d_eng, p_eng_senior, '2022-09-01', 'Active', 65000,
    '34-2234567-8', '2234-5678-9012', '22-345678901-2', '223-456-789-000'
  )
  returning id into e2;

  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary,
    sss_number, pagibig_number, philhealth_number, tin_number
  )
  values (
    v_org, 'EMP-0003', 'Ana', 'Reyes', 'ana.reyes@democompany.ph', '09170000003',
    d_fin, p_fin_staff, '2024-03-10', 'Active', 38000,
    '34-3234567-8', '3234-5678-9012', '32-345678901-2', '323-456-789-000'
  )
  returning id into e3;

  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary
  )
  values (
    v_org, 'EMP-0004', 'Carlo', 'Mendoza', 'carlo.mendoza@democompany.ph', '09170000004',
    d_eng, p_eng_mid, '2025-01-06', 'Onboarding', 55000
  )
  returning id into e4;

  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary
  )
  values (
    v_org, 'EMP-0005', 'Liza', 'Garcia', 'liza.garcia@democompany.ph', '09170000005',
    d_ops, p_ops_lead, '2021-06-21', 'On Leave', 30000
  )
  returning id into e5;

  insert into employees (
    organization_id, employee_no, first_name, last_name, email, phone,
    department_id, position_id, hire_date, status, salary
  )
  values (
    v_org, 'EMP-0006', 'Sofia', 'Navarro', 'sofia.navarro@democompany.ph', '09170000006',
    d_hr, p_hr_staff, current_date - interval '20 days', 'Active', 36000
  )
  returning id into e6;

  ------------------------------------------------------------------
  -- 7. Leave types and leave requests
  ------------------------------------------------------------------
  insert into leave_types (organization_id, name, code, default_days_per_year, is_paid)
  values (v_org, 'Vacation Leave', 'VL', 15, true)
  returning id into lt_vl;

  insert into leave_types (organization_id, name, code, default_days_per_year, is_paid)
  values (v_org, 'Sick Leave', 'SL', 10, true)
  returning id into lt_sl;

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e5, lt_vl, current_date, current_date + 4, 5, 'Family vacation', 'Approved');

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e1, lt_sl, current_date - 7, current_date - 6, 2, 'Flu recovery', 'Pending');

  insert into leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
  values (e2, lt_vl, current_date + 8, current_date + 10, 3, 'Personal time off', 'Pending');

  ------------------------------------------------------------------
  -- 8. Project sites and active employee deployments
  ------------------------------------------------------------------
  insert into project_sites (organization_id, name, is_active)
  values (v_org, 'Daan Pari', true)
  returning id into ps_daan;

  insert into project_sites (organization_id, name, is_active)
  values (v_org, 'Bagac', true)
  returning id into ps_bagac;

  insert into project_sites (organization_id, name, is_active)
  values (v_org, 'Orion', true)
  returning id into ps_orion;

  insert into project_sites (organization_id, name, is_active)
  values (v_org, 'Head Office', true)
  returning id into ps_hq;

  insert into employee_project_deployments (employee_id, project_site_id, assigned_at, is_active)
  values
    (e1, ps_bagac, now() - interval '60 days', true),
    (e2, ps_hq, now() - interval '90 days', true),
    (e3, ps_hq, now() - interval '45 days', true),
    (e4, ps_orion, now() - interval '20 days', true),
    (e5, ps_daan, now() - interval '120 days', true),
    (e6, ps_hq, now() - interval '15 days', true);

  ------------------------------------------------------------------
  -- 9. Attendance records synced to the deployed projects
  --    A mix of present, remote, leave, and absent entries helps the
  --    dashboard, attendance report, and payroll sync screens.
  ------------------------------------------------------------------
  insert into attendance_records (
    employee_id, attendance_date, status, check_in, check_out, notes,
    project_site, period_mode, worked_hours, overtime_hours, overtime_mode
  )
  values
    (e1, current_date - 4, 'Present', '08:00', '17:00', 'Handled supplier coordination', 'Bagac', 'weekly', 8, 0, 'auto'),
    (e1, current_date - 3, 'Present', '08:05', '17:30', 'OT hours: 0.42 | Month-end support', 'Bagac', 'weekly', 8.42, 0.42, 'manual'),
    (e1, current_date - 2, 'Remote', '08:00', '17:00', 'Vendor follow-up', 'Bagac', 'weekly', 8, 0, 'auto'),
    (e1, current_date - 1, 'Present', '08:10', '17:15', 'Site coordination', 'Bagac', 'weekly', 8.08, 0.08, 'auto'),

    (e2, current_date - 4, 'Present', '08:00', '18:00', 'Architecture review', 'Head Office', 'weekly', 9, 1, 'auto'),
    (e2, current_date - 3, 'Present', '08:00', '17:00', 'Core module updates', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e2, current_date - 2, 'Present', '08:20', '17:20', 'Code review', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e2, current_date - 1, 'Remote', '08:00', '17:00', 'Deployment support', 'Head Office', 'weekly', 8, 0, 'auto'),

    (e3, current_date - 4, 'Present', '08:00', '17:00', 'Payroll reconciliation', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e3, current_date - 3, 'Present', '08:00', '17:45', 'OT hours: 0.75 | Payroll cut-off review', 'Head Office', 'weekly', 8.75, 0.75, 'manual'),
    (e3, current_date - 2, 'Present', '08:05', '17:00', 'Statutory deductions review', 'Head Office', 'weekly', 7.92, 0, 'auto'),
    (e3, current_date - 1, 'Present', '08:00', '17:00', 'Report preparation', 'Head Office', 'weekly', 8, 0, 'auto'),

    (e4, current_date - 4, 'Present', '07:30', '17:00', 'Orion site support', 'Orion', 'weekly', 8.5, 0.5, 'auto'),
    (e4, current_date - 3, 'Present', '07:30', '17:30', 'OT hours: 1 | Mobile fix deployment', 'Orion', 'weekly', 9, 1, 'manual'),
    (e4, current_date - 2, 'Absent', null, null, 'Unplanned absence', 'Orion', 'weekly', 0, 0, 'auto'),
    (e4, current_date - 1, 'Present', '07:45', '17:00', 'Bug triage', 'Orion', 'weekly', 8.25, 0.25, 'auto'),

    (e5, current_date - 4, 'Leave', null, null, 'Approved vacation leave', 'Daan Pari', 'weekly', 0, 0, 'auto'),
    (e5, current_date - 3, 'Leave', null, null, 'Approved vacation leave', 'Daan Pari', 'weekly', 0, 0, 'auto'),
    (e5, current_date - 2, 'Leave', null, null, 'Approved vacation leave', 'Daan Pari', 'weekly', 0, 0, 'auto'),
    (e5, current_date - 1, 'Leave', null, null, 'Approved vacation leave', 'Daan Pari', 'weekly', 0, 0, 'auto'),

    (e6, current_date - 4, 'Present', '08:00', '17:00', 'Onboarding documentation', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e6, current_date - 3, 'Present', '08:10', '17:10', 'Employee handbook orientation', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e6, current_date - 2, 'Present', '08:00', '17:00', 'Benefits enrollment', 'Head Office', 'weekly', 8, 0, 'auto'),
    (e6, current_date - 1, 'Remote', '08:00', '17:00', 'Policy acknowledgement tracking', 'Head Office', 'weekly', 8, 0, 'auto');

  ------------------------------------------------------------------
  -- 10. Payroll attendance override sample
  ------------------------------------------------------------------
  insert into payroll_attendance_overrides (
    employee_id, project_site, period_start, period_end,
    paid_days_override, overtime_hours_override, remarks
  )
  values (
    e4,
    'Orion',
    current_date - 4,
    current_date - 1,
    3,
    1.5,
    'Supervisor approved manual adjustment after field verification'
  );

  ------------------------------------------------------------------
  -- 11. Payroll runs and payroll items
  ------------------------------------------------------------------
  insert into payroll_runs (
    organization_id, run_code, pay_period_start, pay_period_end, payout_date,
    status, total_gross_pay, total_sss, total_pagibig, total_philhealth,
    total_other_deductions, total_deductions, total_net_pay, total_employer_cost,
    notes
  )
  values (
    v_org,
    'PR-2026-05',
    '2026-05-01', '2026-05-31', '2026-06-05',
    'Paid',
    135000, 4500, 600, 2700,
    0, 7800, 127200, 145000,
    'May 2026 payroll'
  )
  returning id into run_may;

  insert into payroll_items (
    payroll_run_id, employee_id, hourly_rate, regular_hours, regular_pay,
    overtime_hours, overtime_rate, overtime_pay, allowances, bonus, gross_pay,
    sss_deduction, pagibig_deduction, philhealth_deduction, other_deductions,
    total_deductions, net_pay, employer_cost, remarks
  )
  values
    (run_may, e1, 200, 160, 32000, 0, 0, 0, 2000, 0, 34000, 1200, 100, 640, 0, 1940, 32060, 36000, 'Regular monthly payroll'),
    (run_may, e2, 406, 160, 65000, 5, 507, 2535, 3000, 0, 70535, 1800, 200, 1300, 0, 3300, 67235, 74000, 'Includes overtime'),
    (run_may, e3, 237, 160, 38000, 0, 0, 0, 1500, 0, 39500, 1500, 100, 760, 0, 2360, 37140, 41000, 'Payroll processing month');

  insert into payroll_runs (
    organization_id, run_code, pay_period_start, pay_period_end, payout_date,
    status, total_gross_pay, total_sss, total_pagibig, total_philhealth,
    total_other_deductions, total_deductions, total_net_pay, total_employer_cost,
    notes
  )
  values (
    v_org,
    'PR-2026-06-A',
    current_date - 15, current_date - 1, current_date + 2,
    'Draft',
    86420, 3250, 400, 1700,
    500, 5850, 80570, 92600,
    'Generated from attendance-linked demo data'
  )
  returning id into run_jun;

  insert into payroll_items (
    payroll_run_id, employee_id, hourly_rate, regular_hours, regular_pay,
    overtime_hours, overtime_rate, overtime_pay, allowances, bonus, gross_pay,
    sss_deduction, pagibig_deduction, philhealth_deduction, other_deductions,
    total_deductions, net_pay, employer_cost, remarks
  )
  values
    (run_jun, e4, 264, 24, 6336, 1.5, 330, 495, 0, 0, 6831, 320, 100, 170, 0, 590, 6241, 7320, 'Synced from Orion attendance with override'),
    (run_jun, e1, 154, 32, 4928, 0.5, 193, 96.5, 300, 0, 5324.5, 280, 100, 140, 250, 770, 4554.5, 5750, 'Bagac attendance-based sample');

  ------------------------------------------------------------------
  -- 12. Recruitment sample
  ------------------------------------------------------------------
  insert into job_openings (
    organization_id, department_id, position_id, title, description,
    employment_type, location, salary_min, salary_max, status, opened_at
  )
  values
    (v_org, d_eng, p_eng_senior, 'Senior Software Engineer', 'Build and maintain core HR systems.', 'Full-time', 'Makati City', 70000, 110000, 'Open', current_date - 30),
    (v_org, d_fin, p_fin_staff, 'Payroll Specialist', 'Run Philippine payroll and statutory filings.', 'Full-time', 'Makati City', 35000, 50000, 'Open', current_date - 20),
    (v_org, d_ops, p_ops_staff, 'Project Coordinator', 'Coordinate field deployment and project site updates.', 'Full-time', 'Bataan', 28000, 42000, 'Screening', current_date - 10);

  insert into candidates (first_name, last_name, email, phone, source, notes)
  values
    ('Carla', 'Mendoza', 'carla.mendoza@example.com', '09180000001', 'LinkedIn', 'Strong React background'),
    ('Noel', 'Aquino', 'noel.aquino@example.com', '09180000002', 'Referral', 'Payroll experience in BPO'),
    ('Liza', 'Reyes', 'liza.reyes@example.com', '09180000003', 'Job board', 'Fresh graduate, accounting'),
    ('Mark', 'Evangelista', 'mark.evangelista@example.com', '09180000004', 'Website', 'Field operations coordination experience');

  ------------------------------------------------------------------
  -- 13. Compliance sample
  ------------------------------------------------------------------
  insert into compliance_requirements (
    organization_id, title, description, category, frequency, due_day, is_active
  )
  values
    (v_org, 'SSS Remittance', 'Monthly SSS contribution remittance', 'Statutory', 'Monthly', 10, true),
    (v_org, 'PhilHealth Remittance', 'Monthly PhilHealth contribution remittance', 'Statutory', 'Monthly', 11, true),
    (v_org, 'Pag-IBIG Contributions', 'Monthly Pag-IBIG employer and employee remittance', 'Statutory', 'Monthly', 10, true),
    (v_org, 'BIR 1601-C', 'Monthly withholding tax on compensation', 'Tax', 'Monthly', 10, true),
    (v_org, 'Employee Handbook Acknowledgement', 'Annual review and acknowledgement tracking', 'Policy', 'Annual', 31, true);

  ------------------------------------------------------------------
  -- 14. Admin access sample for admin-users screen
  ------------------------------------------------------------------
  insert into app_users (
    organization_id, full_name, email, username, password, role, is_active
  )
  values (
    v_org, 'Elena Cruz', 'elena.cruz@democompany.ph', 'eng.head', coalesce(v_admin_hash, 'admin'), 'department-head-admin', true
  )
  returning id into u_eng_head;

  insert into app_users (
    organization_id, full_name, email, username, password, role, is_active
  )
  values (
    v_org, 'Paolo Ramos', 'paolo.ramos@democompany.ph', 'ops.head', coalesce(v_admin_hash, 'admin'), 'department-head-admin', true
  )
  returning id into u_ops_head;

  insert into app_user_departments (user_id, department_id)
  values
    (u_eng_head, d_eng),
    (u_ops_head, d_ops),
    (u_ops_head, d_hr);

  ------------------------------------------------------------------
  -- 15. Notifications
  ------------------------------------------------------------------
  insert into notifications (organization_id, user_id, title, message, status)
  values
    (v_org, v_admin, 'Welcome to HR Payroll', 'Sample data has been loaded. Sign in with admin / admin.', 'Unread'),
    (v_org, v_admin, 'Attendance synced', 'Current period attendance records are ready for payroll review.', 'Unread'),
    (v_org, u_eng_head, 'Department access assigned', 'Engineering department access has been configured for your account.', 'Unread');
end $$;
