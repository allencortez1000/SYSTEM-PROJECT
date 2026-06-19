import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

const EMPLOYEE_SELECT = `
  id,
  employee_no,
  first_name,
  middle_name,
  last_name,
  full_name,
  email,
  phone,
  status,
  salary,
  department_id,
  position_id
`;

type EmployeeRow = {
  id: string;
  employee_no: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  salary?: number | string | null;
  department_id?: string | null;
  position_id?: string | null;
};

type LookupMaps = {
  departmentMap: Map<string, string>;
  positionMap: Map<string, string>;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() || 'Employee';
  const lastName = parts.length ? parts.join(' ') : 'Record';

  return {
    firstName,
    lastName,
  };
}

function toEmployeeApi(row: EmployeeRow, lookups: LookupMaps) {
  const fallbackFullName = [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: row.id,
    employeeId: row.employee_no,
    fullName: row.full_name || fallbackFullName,
    email: row.email,
    department: row.department_id ? lookups.departmentMap.get(row.department_id) || 'Unassigned' : 'Unassigned',
    position: row.position_id ? lookups.positionMap.get(row.position_id) || 'Employee' : 'Employee',
    status: row.status || 'Active',
    manager: null,
    salary: Number(row.salary || 0),
  };
}

async function getLookupMaps(): Promise<LookupMaps> {
  const [departmentsResult, positionsResult] = await Promise.all([
    supabase.from('departments').select('id, name'),
    supabase.from('job_positions').select('id, title'),
  ]);

  if (departmentsResult.error) {
    throw departmentsResult.error;
  }

  if (positionsResult.error) {
    throw positionsResult.error;
  }

  return {
    departmentMap: new Map(
      (departmentsResult.data || []).map((department) => [department.id as string, department.name as string]),
    ),
    positionMap: new Map(
      (positionsResult.data || []).map((position) => [position.id as string, position.title as string]),
    ),
  };
}

async function getAllowedDepartmentIds(req: AuthRequest): Promise<string[] | null> {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  if (req.user.role === 'super-admin') {
    return null;
  }

  if (req.user.role !== 'department-head-admin') {
    throw new Error('Insufficient permissions');
  }

  const { data, error } = await supabase
    .from('app_user_departments')
    .select('department_id')
    .eq('user_id', req.user.userId);

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.department_id as string)
    .filter(Boolean);
}



async function getDefaultOrganizationId() {
  const { data: existingOrganizations, error: existingOrgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Demo Company')
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingOrgError) {
    throw existingOrgError;
  }

  if (existingOrganizations && existingOrganizations.length > 0) {
    return existingOrganizations[0].id as string;
  }

  const { data: newOrg, error: newOrgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Company',
      legal_name: 'Demo Company Philippines Inc.',
      country: 'Philippines',
      currency: 'PHP',
    })
    .select('id')
    .single();

  if (newOrgError) {
    throw newOrgError;
  }

  return newOrg.id as string;
}

async function getOrCreateDepartment(organizationId: string, name: string) {
  const departmentName = name?.trim() || 'Unassigned';

  const { data: existingDepartments, error: existingError } = await supabase
    .from('departments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('name', departmentName)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingDepartments && existingDepartments.length > 0) {
    return existingDepartments[0].id as string;
  }

  const { data: created, error: createError } = await supabase
    .from('departments')
    .insert({
      organization_id: organizationId,
      name: departmentName,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id as string;
}

async function getOrCreatePosition(organizationId: string, departmentId: string, title: string) {
  const positionTitle = title?.trim() || 'Employee';

  const { data: existingPositions, error: existingError } = await supabase
    .from('job_positions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('title', positionTitle)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingPositions && existingPositions.length > 0) {
    return existingPositions[0].id as string;
  }

  const { data: created, error: createError } = await supabase
    .from('job_positions')
    .insert({
      organization_id: organizationId,
      department_id: departmentId,
      title: positionTitle,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id as string;
}

router.get('/', async (req, res) => {
  try {
    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    let employeesQuery = supabase.from('employees').select(EMPLOYEE_SELECT).order('created_at', { ascending: false }) as any;

    if (departmentIds !== null) {
      employeesQuery = employeesQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    const [employeesResult, lookups] = await Promise.all([employeesQuery, getLookupMaps()]);

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    res.json({
      employees: ((employeesResult.data || []) as EmployeeRow[]).map((row) => toEmployeeApi(row, lookups)),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to load employees from Supabase',
      error: message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    let employeeQuery = supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', req.params.id) as any;

    if (departmentIds !== null) {
      employeeQuery = employeeQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    const [employeeResult, lookups] = await Promise.all([employeeQuery.maybeSingle(), getLookupMaps()]);

    if (employeeResult.error) {
      throw employeeResult.error;
    }

    if (!employeeResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employee: toEmployeeApi(employeeResult.data as EmployeeRow, lookups),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to load employee from Supabase',
      error: message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fullName, email, department, position, status, salary } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }

    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    if (departmentIds !== null && departmentIds.length === 0) {
      return res.status(403).json({ message: 'No department access assigned' });
    }

    const organizationId = await getDefaultOrganizationId();
    const departmentId = await getOrCreateDepartment(organizationId, department || 'Unassigned');

    if (departmentIds !== null && !departmentIds.includes(departmentId)) {
      return res.status(403).json({ message: 'You can only create employees in your assigned department(s)' });
    }

    const positionId = await getOrCreatePosition(organizationId, departmentId, position || 'Employee');
    const { firstName, lastName } = splitFullName(fullName);

    const employeeNo = `EMP-${Date.now()}`;

    const { data, error } = await supabase
      .from('employees')
      .insert({
        organization_id: organizationId,
        employee_no: employeeNo,
        first_name: firstName,
        last_name: lastName,
        email,
        department_id: departmentId,
        position_id: positionId,
        status: status || 'Active',
        salary: Number(salary) || 0,
      })
      .select(EMPLOYEE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    const lookups = await getLookupMaps();

    res.status(201).json({
      employee: toEmployeeApi(data as EmployeeRow, lookups),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to create employee in Supabase',
      error: message,
    });
  }
});

export default router;
