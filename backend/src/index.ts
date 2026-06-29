import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';



dotenv.config();

// Supabase credentials are read from the environment.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'hr-payroll-secret-2024';
}

const app = express();
const PORT = process.env.PORT ?? 4000;
const hasSupabaseConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.get('/', (_, res) => {
  res.json({
    message: 'HR & Payroll Management System API',
    mode: hasSupabaseConfig ? 'supabase' : 'mock',
  });
});

if (hasSupabaseConfig) {
  // Lazy-load Supabase-backed routes so local development still works without secrets.
  const authRouter = require('./routes/auth').default;
  const employeeRouter = require('./routes/employees').default;
  const payrollRouter = require('./routes/payroll').default;
  const attendanceRouter = require('./routes/attendance').default;
  const dataRouter = require('./routes/data').default;
  const adminUsersRouter = require('./routes/admin-users').default;
  const debugRouter = require('./routes/debug').default;

  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeeRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/admin-users', adminUsersRouter);
  app.use('/api/debug', debugRouter);
} else {
  console.warn('SUPABASE_URL / SUPABASE_SECRET_KEY not found. Starting backend in local readonly mode with no seeded mock data. Configure Supabase credentials for full functionality.');

  // No seeded mock users, employees, or attendance entries are created anymore.
  const users: any[] = [];
  const employees: any[] = [];
  const attendance: any[] = [];

  const createToken = (user: any) =>
    jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.fullName,
        permissions: user.permissions || [],
      },
      process.env.JWT_SECRET ?? 'secret',
      { expiresIn: '8h' },
    );

  const requireAuth = (req: any, res: any, next: any) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authorization header missing or invalid' });
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET ?? 'secret');
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };

  // Login remains available but will only authenticate against configured users (none by default).
  app.post('/api/auth/login', (req, res) => {
    const loginName = String(req.body?.username || req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const user = users.find((item) => item.username === loginName || item.email === loginName);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({
      token: createToken(user),
      user: { id: user.id, username: user.username, email: user.email, role: user.role, name: user.fullName },
    });
  });

  app.get('/api/auth/me', requireAuth, (req: any, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/admin-users', requireAuth, (_req, res) => {
    res.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        isActive: user.isActive,
        permissions: user.permissions,
      })),
    });
  });

  app.get('/api/employees', requireAuth, (req: any, res) => {
    const search = String(req.query.search || '').toLowerCase().trim();
    const limit = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);
    const filtered = search
      ? employees.filter((emp) =>
          emp.fullName.toLowerCase().includes(search) ||
          emp.email.toLowerCase().includes(search) ||
          emp.employeeId.toLowerCase().includes(search),
        )
      : employees;

    res.json({
      employees: filtered.slice(offset, offset + limit),
      count: filtered.length,
      total: employees.length,
    });
  });

  app.get('/api/attendance', requireAuth, (_req, res) => {
    res.json({ attendance });
  });

  app.get('/api/data/departments', requireAuth, (_req, res) => {
    res.json({
      departments: [
        { id: 'dept-ops', name: 'Operations' },
        { id: 'dept-hr', name: 'HR' },
        { id: 'dept-fin', name: 'Finance' },
      ],
    });
  });

  app.post('/api/admin-users/sub-admin', requireAuth, (req: any, res) => {
    if (req.user?.role !== 'super-admin') return res.status(403).json({ message: 'Only super admin can perform this action' });
    const fullName = String(req.body?.fullName || '').trim();
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map((value: unknown) => String(value).trim()).filter(Boolean) : [];
    if (!fullName || !username || !email || password.length < 4 || permissions.length === 0) {
      return res.status(400).json({ message: 'fullName, username, email, password, and at least one permission are required' });
    }
    if (users.some((user) => user.username === username || user.email === email)) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    const newUser = {
      id: `user-${users.length + 1}`,
      username,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'sub-admin',
      fullName,
      isActive: true,
      permissions,
    };
    users.push(newUser);
    res.status(201).json({ user: newUser });
  });

  // admin-users departments
  app.get('/api/admin-users/departments', requireAuth, (_req, res) => {
    res.json({ departments: [
      { id: 'dept-ops', name: 'Operations' },
      { id: 'dept-hr', name: 'HR' },
      { id: 'dept-fin', name: 'Finance' },
      { id: 'dept-eng', name: 'Engineering' },
    ]});
  });

  // attendance projects & assignments — no seeded mock projects when Supabase is not configured
  const mockProjects: any[] = [];
  const mockAssignments: Record<string, string> = {};

  app.get('/api/attendance/projects', requireAuth, (_req, res) => {
    // return an empty list when running without Supabase
    res.json({ projects: mockProjects });
  });

  app.post('/api/attendance/projects', requireAuth, (req: any, res) => {
    // allow creating projects in-memory, but do not seed any defaults
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'name is required' });
    const existing = mockProjects.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return res.status(201).json({ project: existing });
    const project = { id: `proj-${mockProjects.length + 1}`, name };
    mockProjects.push(project);
    res.status(201).json({ project });
  });

  app.get('/api/attendance/assignments', requireAuth, (_req, res) => {
    res.json({ assignments: mockAssignments });
  });

  app.post('/api/attendance/assignments', requireAuth, (req: any, res) => {
    const { employeeId, projectName } = req.body;
    if (!employeeId || !projectName) return res.status(400).json({ message: 'employeeId and projectName are required' });
    mockAssignments[String(employeeId)] = String(projectName);
    res.status(201).json({ assignment: { employeeId, projectName } });
  });

  app.post('/api/attendance', requireAuth, (req: any, res) => {
    const { employeeName, date, status } = req.body;
    if (!employeeName || !date || !status) return res.status(400).json({ message: 'employeeName, date, status required' });
    const record = { id: `att-${Date.now()}`, employeeName, date, status, ...req.body };
    attendance.push(record);
    res.status(201).json({ record });
  });

  // data routes
  app.get('/api/data/payroll-runs', requireAuth, (_req, res) => {
    res.json({ payrollRuns: [], error: null });
  });

  app.get('/api/data/leave', requireAuth, (_req, res) => {
    res.json({ leave: [], error: null });
  });

  app.get('/api/data/candidates', requireAuth, (_req, res) => {
    res.json({ candidates: [], error: null });
  });

  app.get('/api/data/job-openings', requireAuth, (_req, res) => {
    res.json({ jobOpenings: [], error: null });
  });

  app.get('/api/data/compliance', requireAuth, (_req, res) => {
    res.json({ compliance: [], error: null });
  });

  app.get('/api/data/notifications', requireAuth, (_req, res) => {
    res.json({ notifications: [], error: null });
  });

  app.get('/api/data/reports/payroll-summary', requireAuth, (_req, res) => {
    res.json({ metrics: { grossPayroll: 0, netPayout: 0, sssTotal: 0, pagIbigTotal: 0, philHealthTotal: 0, otherDeductions: 0, payrollRuns: 0 }, departments: [], error: null });
  });

  app.get('/api/data/reports/headcount-movement', requireAuth, (_req, res) => {
    res.json({ metrics: { totalEmployees: 0, activeEmployees: 0, newHires: 0, exits: 0, departments: 0 }, departments: [], error: null });
  });

  app.get('/api/data/reports/attendance-insights', requireAuth, (_req, res) => {
    res.json({ metrics: { totalRecords: 0, presentRate: 0, absences: 0, remoteWork: 0, leaveRecords: 0 }, teams: [], error: null });
  });

  app.get('/api/data/reports/compliance-packet', requireAuth, (_req, res) => {
    res.json({ metrics: { laborFilings: 'Pending', policyAcknowledgements: '0 active', payrollEvidence: 'Missing', openRisks: 0 }, checklist: [], error: null });
  });

  app.get('/api/payroll', requireAuth, (_req, res) => {
    res.json({ payrollRuns: [], error: null });
  });

  app.get('/api/payroll/history', requireAuth, (_req, res) => {
    res.json({ history: [], error: null });
  });
}

app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
