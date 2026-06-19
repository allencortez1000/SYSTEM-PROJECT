-- Role-based access control for super admin + department-head admins

create table if not exists app_user_departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, department_id)
);

create index if not exists idx_app_user_departments_user_id
  on app_user_departments(user_id);

create index if not exists idx_app_user_departments_department_id
  on app_user_departments(department_id);

-- Optional: normalize existing app_users roles
-- update app_users set role = 'super-admin' where username = 'admin';
