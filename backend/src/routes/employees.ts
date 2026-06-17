import { Router } from 'express';

const router = Router();

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

router.get('/', (_, res) => {
  res.json({ employees });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const employee = employees.find((item) => item.id === id);

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({ employee });
});

router.post('/', (req, res) => {
  const { fullName, email, department, position, status, manager, salary } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ message: 'fullName and email are required' });
  }

  const nextId = employees.length ? employees[employees.length - 1].id + 1 : 1;
  const newEmployee = {
    id: nextId,
    employeeId: `EMP-${1000 + nextId}`,
    fullName,
    email,
    department: department || 'Unassigned',
    position: position || 'Employee',
    status: status || 'Active',
    manager: manager || null,
    salary: Number(salary) || 0,
  };

  employees.push(newEmployee as any);

  res.status(201).json({ employee: newEmployee });
});

export default router;
