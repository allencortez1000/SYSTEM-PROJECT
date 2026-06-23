# HR & Payroll Management System

Enterprise-grade HR and payroll management platform for small, medium, and large organizations.

## Repo Structure

- `frontend/` - Next.js + Tailwind CSS UI
- `backend/` - Express.js API, JWT authentication, payroll engine
- `docker-compose.yml` - PostgreSQL, backend, and frontend services

## Setup

1. Copy `.env.example` to `.env` in both `backend/` and root if needed.
2. Run `npm install` at repo root.
3. Run `npm run dev` to start frontend and backend concurrently.
4. Use `docker-compose up` for containerized development.

## Local development notes

- Frontend dev server: `http://localhost:3000`
- Backend API: `http://127.0.0.1:4000`
- The frontend proxies `/api/*` requests to the backend through `frontend/next.config.mjs`.
- If `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are missing, the backend now starts in a local mock mode instead of crashing. This keeps login and the main demo flows working locally.
- Default local mock credentials:
  - Username: `admin`
  - Password: `admin`
- If `3000` or `4000` is already in use, stop the old Node processes first, then rerun `npm run dev`.

## Demo data and Supabase sync

- Run `docs/seed.sql` in the Supabase SQL Editor to load a complete demo dataset for the main HR, attendance, payroll, recruitment, compliance, reporting, and admin-access flows.
- After seeding, validate the system with `docs/supabase-sync-checklist.md`.
- Important: `docs/database-schema.md` is legacy documentation and may not match the current Supabase schema exactly. Prefer the backend route usage in `backend/src/routes/` when resolving a mismatch.

## Deployment notes

### Frontend on Netlify

- Netlify builds the Next.js frontend using `netlify.toml`.
- Set `NEXT_PUBLIC_API_URL` in Netlify to the public URL of your backend, for example:
  - `https://your-backend.example.com`
- The frontend rewrite will forward `/api/*` requests to that backend URL.

### Backend hosting

- The Express backend is not deployed by Netlify as part of the frontend site.
- Host the backend separately on a Node-capable platform such as Render, Railway, Fly.io, or a VPS.
- For production with real data, configure:
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `JWT_SECRET`
  - `PORT`

## Features

- Executive HR dashboard
- Employee management
- Attendance and leave overview
- Payroll calculation engine
- Role-based authentication
- Compliance and reporting readiness

## API Endpoints

- `GET /api/` - Status check
- `POST /api/auth/login` - Authenticate user
- `GET /api/employees` - Retrieve sample employee list
- `GET /api/employees/:id` - Get employee record
- `POST /api/payroll/calculate` - Compute payroll components

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Deployment: Docker
