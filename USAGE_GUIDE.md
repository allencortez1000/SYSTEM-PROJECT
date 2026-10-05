Rabino Home Builders Corporation — HR/Payroll System
User Guide: How to Use the Full System

This file is a step-by-step user-facing tutorial explaining how to use the application features from the UI. It's intended for HR staff, Payroll admins, Site managers, and Super Admins.

1. Logging in
- Open: http://localhost:3000
- Enter your credentials and click Sign in.
- On success you’ll see the Dashboard. If you see a 401 or token error, contact your admin to create an account.

2. Dashboard (Overview)
- Purpose: fast snapshot of workforce, payroll estimate, recent hires, and department distribution.
- Top stat cards: check Total Employees, Active Employees, Estimated Payroll. These reflect active staff only.
- Quick actions:
  - Click "Employees" in the left sidebar to go to the employee list
  - Click "Attendance" to manage day-to-day records
  - Click "Payroll" to start a payroll run or open the worksheet

3. Employees — list and search
- Navigate: Sidebar → Employees
- Search: Type name, email, or employee ID in the search box.
- Filters: Department and Project Site picks narrow the list.
- View detail: Click a row to open that employee’s detail page.
- Add worker: Click the "Add worker" button to open the Add Worker form.
  - Fill Full name, Email, Salary amount, Salary basis (Per month / Daily), Department, Position, Project site (optional).
  - Deductions: toggle SSS / Pag-IBIG / PhilHealth / SSS Loan / Tax / Additional and enter manual amounts if needed.
  - Click Save. After save, the worker appears in the list.

4. Employee detail page
- Fields: Full name (displayed surname-first if available), contact, department, position, salary, status.
- Actions:
  - Back to employees — returns to the list
  - Edit (coming soon / or disabled): if available, click to edit details
  - View history: attendance and payroll history (if present) appear here or via the Reports section

5. Attendance — record daily attendance and workload
- Navigate: Sidebar → Attendance
- Project cards: shows projects with assigned workers and counts.
- Save attendance:
  - Select period (Weekly / Semi-monthly / Custom)
  - For each worker and date, choose status (Present/Absent/Leave/Remote) and optionally enter Time In/Time Out.
  - To save many rows: use the "Save attendance" button (saved in parallel for performance).
  - Export: use Excel export to download current view.
- Sync to payroll:
  - Click "Sync from attendance" on the payroll worksheet to import attendance-linked payroll rows.

6. Payroll — start runs and edit worksheet
- Navigate: Sidebar → Payroll
- Start payroll:
  - Click "Start Payroll" → choose Department and Project Site → Continue
  - Opens the full payroll worksheet editor for the selected project & period
- Full-detail editor (worksheet):
  - Each worker row shows info: supervisor, name (surname-first), position, daily rate/salary, days worked, OT hours, computed amounts, deductions, net release.
  - Edit fields inline. Changes do not take effect until you click "Save table" or "Save payroll".
  - Sync from attendance: pulls the latest attendance for the selected period.
  - Export Excel / Print: export the visible worksheet to Excel or print a PDF
- Saving & posting payroll:
  - When ready, click "Save payroll". This will create a payroll run and payroll_items on the backend.
  - Payroll runs are listed in the Payroll center after saving.

7. Leave management
- Navigate: Sidebar → Leave
- The list shows leave requests with status (Pending / Approved / Rejected).
- View details: click a row to open the request modal.
- Approve / Reject: Click Approve or Reject on pending requests. The system updates the request and notifies the requester.
- Summary cards: Total, Pending, Approved, Rejected reflect the current dataset.

8. Recruitment
- Navigate: Sidebar → Recruitment
- View candidates and job openings
- Candidate details: click to open their profile modal (CV, contact, source)
- Note: pipeline actions (advance to interview, make an offer) may be limited based on your current user permissions or future versions.

9. Compliance
- Navigate: Sidebar → Compliance
- Shows compliance checklist items (licenses, filings) and their status (Pending / Overdue / Completed)
- Open items for detail and mark them as reviewed or completed where allowed
- The dashboard card shows aggregated counts of overdue and pending items

10. Admin Access & Sub-admins (Super Admin only)
- Navigate: Sidebar → Admin Access
- Create sub-admin: enter full name, username, email, password, and select permissions (Payroll Management, Attendance Tracking, Reports, Workers/Employees, Departments)
- Assign departments: Department-head admins are linked to specific departments and will only see those departments in lists.

11. Exports & Reports
- Excel export: available on Attendance and Payroll worksheet pages. To export:
  - Filter the view as needed (period, department, project site)
  - Click Export Excel
- Reports: Reports → choose the report card and generate. Some reports may be placeholders (Coming Soon) depending on your build.

12. Notifications & Sessions
- Notifications: Topbar bell shows system notifications if enabled (attendance errors, payroll completion). Click to view details.
- Session: The UI stores a bearer token (`hr_token`) in localStorage. If you log out, the token is cleared.

13. Common actions & tips
- Hard refresh: use Ctrl+Shift+R (or Cmd+Shift+R on mac) if UI seems stale.
- If pages look broken after a code update: close dev server, delete `.next`, and restart the frontend dev server (or run fix-loading.bat).
- For long lists (Employees, Attendance), the UI supports filters — use them to narrow results before exporting.

14. Permissions & roles (quick)
- Super Admin: full access to everything (manage servers, create sub-admins)
- Sub-admin: limited access; visible departments depend on assignments
- Department-head-admin: assigned departments only
- Worker/Employee: typically view-limited role (if the system supports employee self-service)

15. Troubleshooting (user-level)
- Cannot login: Ensure you have a valid account. If running without Supabase configured, the backend will not seed demo users. Ask your IT to create a Super Admin in Supabase or configure credentials.
- Attendance save fails: Check network tab for 401; re-login and retry save. If many rows, the app saves in parallel; a transient network error may require retry.
- Name appears wrong (e.g., "Leon, Arnold De"): The app prefers backend canonical `fullName` (surname-first). If name displays unexpectedly, edit the employee profile to correct `first_name` / `last_name` fields in the backend or the employee edit UI when available.

16. Where to get help
- Developer contact: (internal) — your IT/DevOps or Rabino dev who maintains the Supabase environment
- For immediate local issues, open the browser dev console and backend terminal to view errors


End of guide

If you want this guide adapted for printed handouts, a slide deck for training, or a condensed 1-page quick cheatsheet, tell me which format you need and I will create it as a separate file.