# API Documentation

## Authentication

### POST /api/auth/login
Request body:
- `email`: string
- `password`: string

Response:
- `token`: JWT token
- `user`: { id, email, role, name }

## Employees

### GET /api/employees
Fetch sample employees.

Response:
- `employees`: array of employee objects

### GET /api/employees/:id
Fetch an employee by ID.

Response:
- `employee`: employee object

## Payroll

### POST /api/payroll/calculate
Compute payroll totals.

Request body:
- `basicSalary`: number
- `overtimeHours`: number
- `overtimeRate`: number
- `bonus`: number
- `allowances`: number
- `taxRate`: number
- `insuranceDeduction`: number
- `loanDeduction`: number

Response:
- `grossEarnings`: number
- `totalDeductions`: number
- `netPay`: number
- `taxAmount`: number
- `employerCost`: number
