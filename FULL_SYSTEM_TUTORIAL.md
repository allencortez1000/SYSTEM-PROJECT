# Rabino Home Builders Corporation HR/Payroll System

## Full System Guide

This guide explains how the RHBC HR/Payroll system is structured, how to run it, how the main flows work, and what to check when something breaks.

---

## 1) What the system does

The RHBC system manages:

- employee records
- attendance encoding
- payroll worksheet and payroll runs
- admin and sub-admin access
- department/project assignment
- exports and reporting
- mobile-friendly use on phones and tablets

The goal of the app is to keep the core HR workflow usable and readable on any screen size while preserving the same data in the backend database.

---

## 2) Architecture overview

### Frontend
- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Main role: user interface, forms, tables, modals, exports, and navigation

### Backend
- Framework: Express.js
- Language: TypeScript
- Main role: authentication, data validation, CRUD routes, payroll logic, and DB persistence

### Database / persistence
- Production database: Supabase
- Some local modes may run with reduced or empty data if Supabase credentials are missing
- Payroll and attendance actions should always persist through backend routes, not only in browser state

### Deployment
- Frontend: Netlify
- Backend: Render or another Node-capable host
- Environment variable used by frontend:
  - `NEXT_PUBLIC_API_URL`

---

## 3) Repository layout

### Frontend key files
- `frontend/app/page.tsx` — dashboard
- `frontend/app/employees/page.tsx` — employee list
- `frontend/app/employees/new/page.tsx` — add employee form
- `frontend/app/employees/[id]/page.tsx` — employee detail page
- `frontend/app/employees/[id]/edit/page.tsx` — employee edit page
- `frontend/app/attendance/page.tsx` — attendance workspace
- `frontend/app/payroll/page.tsx` — payroll center
- `frontend/app/payroll/new/page.tsx` — payroll worksheet editor
- `frontend/app/admin-users/page.tsx` — admin access and user management
- `frontend/app/leave/page.tsx` — leave management
- `frontend/app/recruitment/page.tsx` — recruitment
- `frontend/app/compliance/page.tsx` — compliance
- `frontend/app/components/dashboard-shell.tsx` — shared app shell and navigation
- `frontend/app/globals.css` — global styles and responsive shell rules

### Backend key files
- `backend/src/index.ts` — server bootstrap
- `backend/src/routes/auth.ts` — login and session-related routes
- `backend/src/routes/employees.ts` — employee CRUD
- `backend/src/routes/attendance.ts` — attendance save/query
- `backend/src/routes/payroll.ts` — payroll logic and payroll persistence
- `backend/src/routes/admin-users.ts` — admin/sub-admin management
- `backend/src/routes/data.ts` — read-only reporting endpoints
- `backend/src/lib/attendanceSummary.ts` — shared attendance summary helper

### Documentation and utilities
- `README.md` — top-level project summary
- `USAGE_GUIDE.md` — user-facing how-to guide
- `GITHUB_PUSH_GUIDE.md` — pushing workflow guidance
- `docs/migration-payroll-schedule.sql` — required live DB migration for payroll schedule fields
- `docs/fix-login-password-hash-compat.sql` — compatibility fix for login password hashing

---

## 4) Prerequisites

Before running locally, make sure you have:

- Node.js 18 or newer
- npm
- Git
- a Supabase project for production-like persistence
- access to the backend environment variables

On Windows, you can use PowerShell, CMD, or the included batch helpers.

---

## 5) Environment variables

### Frontend
Set the backend API base URL in the frontend environment:

- `NEXT_PUBLIC_API_URL`

Example:

```env
NEXT_PUBLIC_API_URL=https://your-backend.example.com
```

### Backend
Typical backend variables include:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `JWT_SECRET`
- `PORT`

Important notes:
- `JWT_SECRET` should be strong and unique in production.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are required for live persistence.
- If Supabase variables are missing, the backend may run in a limited local mode, but that is not a production setup.

---

## 6) How to run the system locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

### Root-level helpers
The repo also includes helper scripts such as:

- `start-dev.bat`
- `fix-loading.bat`

Use these only if they match your local workflow.

### Default local URLs
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

---

## 7) Core user flows

## 7.1 Login
1. Open the app.
2. Sign in with a valid account.
3. After login, the UI stores a bearer token in local storage under `hr_token`.
4. All protected API requests use that token.

If login fails:
- check the browser console
- check the backend logs
- confirm the backend is reachable
- confirm the user exists and the password is correct

---

## 7.2 Dashboard
The dashboard gives a quick summary of:

- total workers/employees
- active employees
- recent activity
- department or project distributions
- quick navigation to the major modules

This page is the main landing screen after login.

---

## 7.3 Employees
Use the employee module to:

- browse workers
- search/filter records
- add new employees
- view employee details
- edit employee information

### Good practice
- Keep names and IDs consistent with the backend.
- Prefer saving changes through the employee forms rather than editing browser-only state.
- If a worker detail page or edit page is missing in deployment, confirm the route folder is committed and included in the deployed build.

---

## 7.4 Attendance
The attendance module is where supervisors and HR encode daily records.

### What it supports
- daily attendance entry
- date range selection
- status selection such as Present, Halfday, Absent, Leave, and Remote
- check-in / check-out time input
- overtime handling
- Excel export
- delete/edit attendance records
- project and department assignment

### Mobile behavior
The attendance workspace is designed to remain usable on smaller screens:
- cards stack vertically
- modal buttons become full-width on phones
- dense sections reduce padding
- the workspace is scrollable without breaking the page shell

### Persistence note
Attendance changes should be saved through the backend so they appear in payroll syncing and later reports.

---

## 7.5 Payroll
Payroll is split into two layers:

### Payroll center
- lists or starts payroll runs
- acts as the entry point to the payroll process
- connects department/project selection with the full worksheet

### Payroll worksheet editor
The worksheet editor is used to:

- review worker rows
- edit daily rate, days worked, OT hours, and deductions
- see computed salary totals
- sync from attendance
- export to Excel
- print the worksheet
- save payroll runs and row-level data

### Key payroll rules
- payroll values should be recalculated from the row inputs
- attendance-linked rows should remain synchronized where applicable
- backend persistence is required for payroll history and auditability

---

## 7.6 Admin Access
The admin module handles:

- admin and sub-admin management
- department restrictions
- permission-aware access
- workforce/admin oversight tools

Use this area carefully because it controls who can see and manage sensitive HR data.

---

## 7.7 Leave, Recruitment, and Compliance
These modules round out the HR system:

- Leave: request tracking and approval workflow
- Recruitment: candidate and job-related workflows
- Compliance: policy, filing, and status tracking

Some sections may be more mature than others depending on the deployed version, but the layout is consistent with the rest of the app.

---

## 8) Backend API overview

This is a high-level summary of the common API areas.

### Authentication
- `POST /api/auth/login`
- `GET /api/auth/me`

### Employees
- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`

### Attendance
- `GET /api/attendance`
- `POST /api/attendance`
- `DELETE /api/attendance/:id`
- `GET /api/attendance/projects`
- `GET /api/attendance/assignments`

### Payroll
- `POST /api/payroll/save`
- `POST /api/payroll/calculate`
- payroll attendance override/save routes used by the worksheet

### Admin users
- `GET /api/admin-users/departments`
- `POST /api/admin-users/sub-admin`

### Notes
- Most protected routes require `Authorization: Bearer <token>`.
- The frontend already reads and sends the token from `hr_token`.
- The backend should be the source of truth for saved records.

---

## 9) Responsive design rules in the app

The UI was specifically adjusted to stay readable across device sizes.

### Shared shell
- mobile sidebar drawer works on small screens
- body scroll is locked while the drawer is open
- headers and top actions use compact spacing
- page shells use responsive spacing rules instead of fixed large gaps

### Page-level behavior
- cards stack earlier on phones
- tables become card-based or horizontally scrollable when necessary
- modal dialogs use mobile-friendly widths and button stacking
- dense editors keep labels and values visible without cramming

### Practical result
Users should be able to:
- read the details on a phone without zooming constantly
- open and use modals on mobile
- complete attendance and payroll workflows without horizontal overflow

---

## 10) Persistence and syncing rules

A good system guide should be clear about what must be saved where.

### Browser state vs backend state
- Browser state is temporary and may reset on refresh
- Backend state is the source of truth
- Payroll and attendance workflows should always persist to the backend when the action is meant to be permanent

### Syncing principles
- attendance should feed payroll where supported
- department/project assignments should remain consistent across modules
- live updates should be reloaded from the API rather than assumed from old cached data

### Supabase note
If a required column or migration is missing in Supabase, the frontend may still load but save actions can fail. For payroll schedule changes, apply the documented SQL migration first.

---

## 11) Deployment guide

### Frontend on Netlify
1. Connect the repo to Netlify.
2. Set `NEXT_PUBLIC_API_URL` to the public backend URL.
3. Deploy the frontend branch.
4. Verify that dynamic routes are included in the build.

### Backend hosting
Host the backend on a Node-capable service such as:
- Render
- Railway
- Fly.io
- VPS

Set the required environment variables and confirm the backend can reach Supabase.

### Important deployment checks
- The employee edit route must be committed so it is included in the deployed build.
- The frontend must point to the correct backend URL.
- Database migrations must be applied before trying new payroll fields.

---

## 12) Troubleshooting

### App does not load or keeps redirecting
- check whether the backend is up
- check auth token handling
- inspect browser console for 401 errors

### Attendance saves fail
- confirm the user is authenticated
- confirm the selected date/range is valid
- check backend logs for validation or persistence errors

### Payroll data does not save correctly
- check whether the live DB migration has been applied
- confirm the backend route is accepting the submitted date and payroll fields
- confirm the row data is being saved through the backend, not only in local storage

### Page looks broken after a code update
- stop dev servers
- delete the Next.js build cache if needed
- restart the frontend and backend

### A route works locally but 404s in deployment
- confirm the route folder is tracked in Git
- confirm the deploy branch contains the file
- rebuild and redeploy after pushing the missing route

---

## 13) Validation checklist

Use this list when verifying a release:

- login works
- dashboard loads
- employees list loads
- employee detail page opens
- employee edit/add flows work
- attendance encodes and saves
- attendance exports to Excel
- payroll worksheet opens
- payroll rows can be edited and saved
- payroll sync from attendance works
- admin access screens load correctly
- mobile navigation works on small screens
- modal dialogs are usable on phones
- backend saves data persistently

---

## 14) Maintenance notes

- Keep API contracts aligned between frontend and backend.
- Apply SQL migrations before deploying features that depend on new columns.
- Avoid relying on browser-only state for important records.
- Add tests for payroll and attendance calculations when possible.
- Keep the responsive shell consistent when adding new pages.

---

## 15) Quick command reference

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### TypeScript checks
```bash
cd frontend
npx tsc --noEmit
```

```bash
cd backend
npx tsc --noEmit
```

### Git status checks
```bash
git status
```

---

## 16) Recommended next improvements

If you want the system guide to evolve into a complete operations manual, the next useful additions are:

- screenshot-based walkthroughs for each page
- role-by-role permissions matrix
- exact API request/response examples
- database schema appendix
- payroll calculation examples
- troubleshooting by error code

---

## 17) Summary

The RHBC system is a full HR and payroll platform with:

- responsive frontend navigation and layout
- employee management
- attendance encoding and syncing
- payroll worksheet editing and persistence
- admin controls
- Supabase-backed data storage

The current design goal is for the app to stay clear and functional on desktop, tablet, and mobile devices without losing any core workflow.

---

*Last updated: 2026-07-10*