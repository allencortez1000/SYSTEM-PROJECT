import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

type EmployeeRow = {
  id: string;
  employee_no: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  salary?: number | null;
  departments?: {
    name?: string | null;
  } | null;
  job_positions?: {
    title?: string | null;
  } | null;
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

function toEmployeeApi(row: any) {
  return {
    id: row.id,
    employeeId: row.employee_no,
    fullName: row.full_name,
    email: row.email,
    department: row.departments?.name || 'Unassigned',
    position: row.job_positions?.title || 'Employee',
    status: row.status || 'Active',
    manager: null,
    salary: Number(row.salary || 0),
  };
}

async function getDefaultOrganizationId() {
  const { data: existingOrganizations, error: existingOrgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', 'Demo Company')
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

router.get('/', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
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
        departments(name),
        job_positions(title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      employees: (data || []).map((row) => toEmployeeApi(row)),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load employees from Supabase',
      error: (error as Error).message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
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
        departments(name),
        job_positions(title)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employee: toEmployeeApi(data),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load employee from Supabase',
      error: (error as Error).message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { fullName, email, department, position, status, salary } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ message: 'fullName and email are required' });
    }

    const organizationId = await getDefaultOrganizationId();
    const departmentId = await getOrCreateDepartment(organizationId, department || 'Unassigned');
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
      .select(`
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
        departments(name),
        job_positions(title)
      `)
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      employee: toEmployeeApi(data),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create employee in Supabase',
      error: (error as Error).message,
    });
  }
});

export default router;
