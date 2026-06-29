const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const employees = [
  {
    id: 1,
    employeeId: 'HR-1001',
    fullName: 'Amelia Hart',
    email: 'amelia.hart@example.com',
    department: 'Human Resources',
    position: 'Lead HR Administrator',
    status: 'Active',
    manager: 'Jordan Cole',
    salary: 98000,
  },
  {
    id: 2,
    employeeId: 'PAY-1023',
    fullName: 'Noah Bennett',
    email: 'noah.bennett@example.com',
    department: 'Payroll',
    position: 'Payroll Manager',
    status: 'Active',
    manager: 'Amelia Hart',
    salary: 92000,
  },
];

app.get('/', (_, res) => res.json({ message: 'HR & Payroll Management System API (JS server)' }));

app.get('/api/employees', (_, res) => res.json({ employees }));

app.get('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id);
  const employee = employees.find((e) => e.id === id);
  if (!employee) return res.status(404).json({ message: 'Worker / Employee not found' });
  res.json({ employee });
});

app.post('/api/employees', (req, res) => {
  const { fullName, email, department, position, status, manager, salary } = req.body;

  // server-side validation
  const errors = {};
  if (!fullName || String(fullName).trim().length === 0) {
    errors.fullName = 'Full name is required';
  }
  if (!email || String(email).trim().length === 0) {
    errors.email = 'Email is required';
  } else {
    const emailStr = String(email).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      errors.email = 'Email is not valid';
    }
  }
  if (salary !== undefined && salary !== null) {
    const s = Number(salary);
    if (Number.isNaN(s) || s < 0) errors.salary = 'Salary must be a non-negative number';
  }

  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Validation failed', errors });
  }

  const nextId = employees.length ? employees[employees.length - 1].id + 1 : 1;
  const newEmployee = {
    id: nextId,
    employeeId: `EMP-${1000 + nextId}`,
    fullName: String(fullName).trim(),
    email: String(email).trim(),
    department: department || 'Unassigned',
    position: position || 'Employee',
    status: status || 'Active',
    manager: manager || null,
    salary: salary !== undefined ? Number(salary) : 0,
  };
  employees.push(newEmployee);
  res.status(201).json({ employee: newEmployee });
});

app.post('/api/payroll/calculate', (req, res) => {
  const c = req.body || {};
  const errors = {};

  function isNumberField(v) {
    return v !== undefined && v !== null && typeof v === 'number' && !Number.isNaN(v);
  }

  if (!isNumberField(c.basicSalary) || c.basicSalary < 0) errors.basicSalary = 'Basic salary is required and must be a non-negative number';
  if (c.overtimeHours !== undefined && (!isNumberField(c.overtimeHours) || c.overtimeHours < 0)) errors.overtimeHours = 'Overtime hours must be a non-negative number';
  if (c.overtimeRate !== undefined && (!isNumberField(c.overtimeRate) || c.overtimeRate < 0)) errors.overtimeRate = 'Overtime rate must be a non-negative number';
  if (c.bonus !== undefined && (!isNumberField(c.bonus) || c.bonus < 0)) errors.bonus = 'Bonus must be a non-negative number';
  if (c.allowances !== undefined && (!isNumberField(c.allowances) || c.allowances < 0)) errors.allowances = 'Allowances must be a non-negative number';
  if (c.taxRate !== undefined && (!isNumberField(c.taxRate) || c.taxRate < 0 || c.taxRate > 1)) errors.taxRate = 'Tax rate must be between 0 and 1';
  if (c.insuranceDeduction !== undefined && (!isNumberField(c.insuranceDeduction) || c.insuranceDeduction < 0)) errors.insuranceDeduction = 'Insurance deduction must be a non-negative number';
  if (c.loanDeduction !== undefined && (!isNumberField(c.loanDeduction) || c.loanDeduction < 0)) errors.loanDeduction = 'Loan deduction must be a non-negative number';

  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Validation failed', errors });
  }

  const overtimePay = (c.overtimeHours || 0) * (c.overtimeRate || 0);
  const grossEarnings = (c.basicSalary || 0) + overtimePay + (c.bonus || 0) + (c.allowances || 0);
  const taxAmount = Math.round(grossEarnings * (c.taxRate || 0));
  const totalDeductions = taxAmount + (c.insuranceDeduction || 0) + (c.loanDeduction || 0);
  const netPay = Math.max(0, grossEarnings - totalDeductions);
  const employerCost = grossEarnings + (c.insuranceDeduction || 0);
  res.json({ grossEarnings, totalDeductions, netPay, taxAmount, employerCost });
});

app.listen(PORT, () => console.log(`JS backend running on port ${PORT}`));
