Rabino Home Builders Corporation — HR/Payroll Management System

Full system tutorial

This single-file guide covers architecture, local development, key flows, API reference, troubleshooting, security, maintenance, and recommended next steps.

TABLE OF CONTENTS
1) Project overview
2) Repository layout (key files & paths)
3) Prerequisites
4) Environment variables
5) Run the system locally (dev)
6) Main UI workflows
7) Backend APIs (important routes & payloads)
8) Development notes and Fast Refresh
9) Troubleshooting checklist
10) Security checklist / hardening
11) Testing & validation (manual smoke tests)
12) Maintenance & operations
13) Recommended follow-up improvements
14) Quick reference commands
15) Files changed during cleanup (summary)

---

1) Project overview
- Purpose: HR + Payroll + Attendance + Compliance system for Rabino Home Builders Corporation.
- Tech stack:
  - Frontend: Next.js (React) + TypeScript + Tailwind CSS
  - Backend: Node/Express + TypeScript (Supabase for production DB)
  - Local dev: backend has a readonly mock mode when Supabase credentials are not present
- Default dev ports:
  - Frontend: http://localhost:3000
  - Backend: http://localhost:4000

2) Repository layout (key files & paths)
- Root: SYSTEM-PROJECT
- Frontend paths (Next.js app dir):
  - frontend/app/page.tsx — Dashboard
  - frontend/app/employees/page.tsx — Employee list
  - frontend/app/employees/new/page.tsx — Add worker form
  - frontend/app/employees/[id]/page.tsx — Employee detail
  - frontend/app/attendance/page.tsx — Attendance hub
  - frontend/app/payroll/page.tsx — Payroll center
  - frontend/app/payroll/new/page.tsx — Full payroll worksheet editor
  - frontend/app/leave/page.tsx — Leave management
  - frontend/app/recruitment/page.tsx — Recruitment
  - frontend/app/compliance/page.tsx — Compliance
  - frontend/app/components/ — shared components (dashboard-shell, filter-bar, etc.)
- Backend paths:
  - backend/src/index.ts — bootstrap (Supabase vs readonly)
  - backend/src/routes/auth.ts — auth/login
  - backend/src/routes/employees.ts — employees CRUD
  - backend/src/routes/attendance.ts — attendance save/query
  - backend/src/routes/payroll.ts — payroll logic
  - backend/src/routes/admin-users.ts — admin/sub-admin management
  - backend/src/routes/data.ts — read-only report endpoints
  - backend/server.js — small JS mock server for simple local testing
  - backend/scripts/ — utility scripts

3) Prerequisites
- Node.js v18+ (recommended)
- npm (or yarn)
- Git
- (Optional) Supabase project for production-like DB
- On Windows: Powershell or CMD; start-dev.bat included for convenience

4) Environment variables
- Recommended for production/Supabase:
  - SUPABASE_URL
  - SUPABASE_SECRET_KEY
  - JWT_SECRET (required — do not use a default in production)
- For local readonly mode: if SUPABASE_* variables are missing, the backend runs without seeded data (readonly mode). This prevents demo accounts from being present by default.

5) Run the system locally (dev)
- Backend
  - cd backend
  - npm install
  - npm run dev
- Frontend
  - cd frontend
  - npm install
  - npm run dev
- Alternatives
  - Use `start-dev.bat` in the project root to start both servers if configured.

6) Main UI workflows
- Login: authenticate (no demo backdoor; use actual user in Supabase or create via admin endpoints)
- Dashboard: overview stats, recent employees, department distribution
- Employees: search, filter, add worker, view/edit details
- Attendance: assign workers, save daily attendance, export to Excel, sync to payroll
- Payroll: start payroll, full worksheet editor, compute government deductions, save payroll run
- Leave: approve/reject leave requests
- Recruitment, Compliance: reporting and item management (read/write coverage varies)

7) Backend APIs (important routes & payloads)
- Auth
  - POST /api/auth/login { username/email, password } → { token, user }
  - GET /api/auth/me (Bearer token)
- Employees
  - GET /api/employees?search=&limit=&offset= → { employees, count, total }
  - GET /api/employees/:id → { employee }
  - POST /api/employees { fullName, email, department, position, status, manager, salary }
  - PATCH /api/employees/:id — update fields
  - DELETE /api/employees/:id
- Attendance
  - GET /api/attendance
  - POST /api/attendance (upsert): { employeeName or employeeId, attendance_date, status, project_site }
  - DELETE /api/attendance/:id
- Payroll
  - POST /api/payroll/calculate — compute components for preview
  - POST /api/payroll/save — save payroll run and items
- Admin users
  - GET /api/admin-users/departments — returns departments for current user (scoped)
  - POST /api/admin-users/sub-admin — create sub-admin (super-admin only)

8) Development notes and Fast Refresh
- Fast Refresh: Next.js hot-reloads components when you save changes; messages appear in the console like "[Fast Refresh] rebuilding". It's normal and keeps state where possible.
- Token usage: frontend stores bearer token under `hr_token` in localStorage — all API calls must send Authorization: Bearer <token>.
- Local readonly mode: if Supabase isn't configured, backend runs without seeded mock data (empty lists). This avoids demo accounts in repo snapshots.
- Name formatting: frontend prefers canonical `fullName` from backend; fallback uses a safe surname-first formatting.

9) Troubleshooting checklist
- Build errors: run `npm install` and `npx tsc --noEmit` in frontend/backend to locate TypeScript issues.
- Fast Refresh loop or chunk errors: stop servers, delete `.next` (or run fix-loading.bat), restart.
- 401 errors: confirm `hr_token` in localStorage and that fetch requests send Authorization header.
- Port conflicts: kill node processes or change ports.
- Attendance save failures: ensure hr_token present, check bulk saves are parallelized (Promise.all) to reduce timeout risk.

10) Security checklist / hardening
- Set JWT_SECRET env var in production (do not allow default fallback)
- Use Supabase in production; do not run readonly mock mode
- Enforce strong passwords and increase password minimum length
- Add rate-limiting for auth and user creation endpoints
- Add audit logging for admin actions and payroll saves

11) Testing & validation (manual smoke tests)
- Start both servers
- Create admin user in Supabase or via API
- Login and confirm `hr_token`
- Add worker, then view detail
- Assign attendance, sync to payroll, compute and save payroll run
- Approve a leave request

12) Maintenance & operations
- Backups: use Supabase backup/export or regular DB dump
- Logs: forward backend logs to aggregator in production
- Migrations: use SQL migration scripts when changing DB schema

13) Recommended follow-up improvements
- Add unit/integration tests for payroll calculations
- Add audit logs and RBAC enforcement server-side
- Add pagination/virtualization for large lists
- Add seed script for local dev that runs only when explicitly invoked
- Improve token refresh / revocation mechanisms

14) Quick reference commands
- Start frontend: cd frontend && npm run dev
- Start backend: cd backend && npm run dev
- TypeScript checks: cd frontend && npx tsc --noEmit ; cd backend && npx tsc --noEmit
- Clear Next cache: fix-loading.bat

15) Files changed during cleanup (summary)
- frontend/app/employees/new/page.tsx — updated header & toast to "worker / employee"; options fetched from API
- frontend/app/attendance/page.tsx — fixed auth header usage, parallel save, skipped Sundays
- frontend/app/leave/page.tsx — approve/reject hooked up; color-coded badges
- frontend/app/payroll/new/page.tsx — use backend fullName preferentially; sort rows alphabetically
- frontend/app/* — other minor UI and bugfix edits
- backend/src/index.ts — removed seeded mock accounts and employees; readonly mode when Supabase not configured
- backend/server.js — removed seeded sample employees
- backend/scripts/normalize-employee-deductions.ts — updated logs wording
- backend/src/routes/* — various bugfixes (attendance select, admin-users departments scoping, payroll fixes)

---

How to get the full diffs or a commit
- I can produce a per-file diff for the changes I applied locally and stage them as a branch or commit. Tell me whether you want me to create a branch and push or just provide the diff here.

If you need more detail in any section (e.g., exact API payload examples, field-level descriptions, or step-by-step smoke test with API curl snippets), tell me which section and I will expand it inline in this file or produce a separate file.

---

Last updated: This copy was generated automatically by the cleanup assistant after a full audit and a safe fix pass. Review the changes and run the dev environment locally to verify flows in your environment.
