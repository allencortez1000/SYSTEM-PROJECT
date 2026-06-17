# Architecture Overview

## System Layers

- **Frontend**: Next.js app for responsive enterprise UI with Tailwind CSS. Uses React components and client-side interactions for dashboards, employee management, payroll forms, and self-service portals.
- **Backend**: Express.js API providing authentication, employee data, payroll calculations, and future modules for attendance, leave, recruitment, and reports.
- **Database**: PostgreSQL for core HR/payroll data storage and audit trail support.
- **Authentication**: JWT-based auth with role-based access controls and middleware for API protection.
- **Deployment**: Docker Compose for local container orchestration, enabling PostgreSQL, backend, and frontend services.

## Key Modules

- `frontend/`
  - `app/`: Next.js app router pages and layout.
  - `components/`: Shared UI shell and dashboard widgets.
  - `globals.css`: Tailwind styling and enterprise theme.

- `backend/`
  - `src/index.ts`: Express server entrypoint.
  - `src/routes/`: Auth, employees, payroll endpoints.
  - `src/controllers/`: Payroll engine and business logic.
  - `src/middleware/`: Authentication and RBAC helpers.

## Deployment Path

1. `docker-compose.yml` launches:
   - PostgreSQL database
   - Backend API service
   - Frontend Next.js app
2. Environment variables configure secure JWT and database connectivity.
3. Backend exposes `api/` routes consumed by frontend pages.
