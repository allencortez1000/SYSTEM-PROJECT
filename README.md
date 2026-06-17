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
