import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { canonicalDepartmentName } from '../lib/departmentNames';
import { AuthRequest, requireSuperAdmin, verifyToken } from '../middleware/auth';

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
  salary_basis,
  has_sss,
  has_pagibig,
  has_philhealth,
  has_sss_loan,
  has_tax,
  has_additional_deduction,
  sss_amount,
  pagibig_amount,
  philhealth_amount,
  sss_loan_amount,
  tax_amount,
  additional_deduction_amount,
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
  salary_basis?: string | null;
  has_sss?: boolean | null;
  has_pagibig?: boolean | null;
  has_philhealth?: boolean | null;
  has_sss_loan?: boolean | null;
  has_tax?: boolean | null;
  has_additional_deduction?: boolean | null;
  sss_amount?: number | string | null;
  pagibig_amount?: number | string | null;
  philhealth_amount?: number | string | null;
  sss_loan_amount?: number | string | null;
  tax_amount?: number | string | null;
  additional_deduction_amount?: number | string | null;
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

function normalizeAmount(value: unknown) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSurnameFirst(row: EmployeeRow) {
  const lastName = String(row.last_name || '').trim();
  const firstName = String(row.first_name || '').trim();
  const middleName = String(row.middle_name || '').trim();

  const givenNames = [firstName, middleName].filter(Boolean).join(' ').trim();
  if (lastName && givenNames) {
    return `${lastName}, ${givenNames}`;
  }
  return row.full_name || [firstName, middleName, lastName].filter(Boolean).join(' ').trim() || 'Unnamed employee';
}

function toEmployeeApi(row: EmployeeRow, lookups: LookupMaps, projectSite = 'Unassigned') {
  return {
    id: row.id,
    employeeId: row.employee_no,
    fullName: formatSurnameFirst(row),
    email: row.email,
    department: row.department_id ? lookups.departmentMap.get(row.department_id) || 'Unassigned' : 'Unassigned',
    projectSite,
    position: row.position_id ? lookups.positionMap.get(row.position_id) || 'Employee' : 'Employee',
    status: row.status || 'Active',
    manager: null,
    salary: Number(row.salary || 0),
    salaryBasis: row.salary_basis || 'monthly',
    hasSss: row.has_sss ?? true,
    hasPagIbig: row.has_pagibig ?? true,
    hasPhilHealth: row.has_philhealth ?? true,
    hasSssLoan: row.has_sss_loan ?? true,
    hasTax: row.has_tax ?? true,
    hasAdditionalDeduction: row.has_additional_deduction ?? true,
    sssAmount: row.sss_amount == null ? 0 : Number(row.sss_amount),
    pagIbigAmount: row.pagibig_amount == null ? 0 : Number(row.pagibig_amount),
    philHealthAmount: row.philhealth_amount == null ? 0 : Number(row.philhealth_amount),
    sssLoanAmount: row.sss_loan_amount == null ? 0 : Number(row.sss_loan_amount),
    taxAmount: row.tax_amount == null ? 0 : Number(row.tax_amount),
    additionalDeductionAmount: row.additional_deduction_amount == null ? 0 : Number(row.additional_deduction_amount),
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

async function getEmployeeProjectSite(employeeId: string) {
  const { data, error } = await supabase
    .from('employee_project_deployments')
    .select('project_site_id, project_sites!inner(name)')
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const row = data && data[0] as any;
  return String(row?.project_sites?.name || 'Unassigned');
}

async function setEmployeeProjectSite(employeeId: string, projectSite: string) {
  const siteName = String(projectSite || '').trim() || 'Unassigned';
  const { data: project } = await supabase
    .from('project_sites')
    .select('id, name')
    .ilike('name', siteName)
    .limit(1)
    .maybeSingle();

  const projectId = project?.id
    ? project.id
    : await (async () => {
        const { data: created, error } = await supabase
          .from('project_sites')
          .insert({ name: siteName })
          .select('id')
          .single();
        if (error) throw error;
        return created.id as string;
      })();

  const { error: deactivateError } = await supabase
    .from('employee_project_deployments')
    .update({ is_active: false })
    .eq('employee_id', employeeId);
  if (deactivateError) throw deactivateError;

  const { error: upsertError } = await supabase
    .from('employee_project_deployments')
    .upsert({
      employee_id: employeeId,
      project_site_id: projectId,
      assigned_at: new Date().toISOString(),
      is_active: true,
    });
  if (upsertError) throw upsertError;
}

async function getAllowedDepartmentIds(req: AuthRequest): Promise<string[] | null> {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Super admin can access all departments
  if (req.user.role === 'super-admin') {
    return null;
  }

  // Department head can access only assigned departments
  if (req.user.role === 'department-head-admin') {
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

  // Sub-admins: allow if they have the 'employees' permission
  if (req.user.role === 'sub-admin') {
    const { data: userRows, error: userError } = await supabase
      .from('app_users')
      .select('permissions')
      .eq('id', req.user.userId)
      .limit(1);

    if (userError) throw userError;
    const userRow = userRows && userRows[0];
    const permissions = Array.isArray(userRow?.permissions) ? userRow.permissions.map((p: unknown) => String(p)) : [];

    if (permissions.includes('employees')) {
      // Give access to all departments for sub-admins with the employees permission
      return null;
    }

    throw new Error('Insufficient permissions');
  }

  throw new Error('Insufficient permissions');
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
  const departmentName = canonicalDepartmentName(name) || 'Unassigned';

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

    const search = String(req.query.search || '').trim();
    const limit = Number(req.query.limit || 25);
    const offset = Number(req.query.offset || 0);

    let employeesQuery = supabase.from('employees').select(EMPLOYEE_SELECT, { count: 'exact' }).order('last_name', { ascending: true }).order('first_name', { ascending: true }) as any;

    if (departmentIds !== null) {
      employeesQuery = employeesQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    if (search) {
      // Use ilike for case-insensitive partial matching on full_name, employee_no, and email
      const searchPattern = `%${search}%`;
      employeesQuery = employeesQuery.or(`full_name.ilike.${searchPattern},employee_no.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }

    if (limit > 0) {
      employeesQuery = employeesQuery.range(offset, offset + limit - 1);
    }

    const [employeesResult, lookups] = await Promise.all([employeesQuery, getLookupMaps()]);

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const rows = (employeesResult.data || []) as EmployeeRow[];

    // Fetch project sites for all employees
    const projectSitesMap = new Map<string, string>();
    if (rows.length > 0) {
      const { data: deployments } = await supabase
        .from('employee_project_deployments')
        .select('employee_id, project_sites!inner(name)')
        .eq('is_active', true)
        .in('employee_id', rows.map(r => r.id));

      if (deployments) {
        for (const deployment of deployments as any[]) {
          if (deployment.employee_id && deployment.project_sites?.name) {
            projectSitesMap.set(deployment.employee_id, deployment.project_sites.name);
          }
        }
      }
    }

    // Client-side filter to ensure search accuracy
    let filteredRows = rows;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredRows = rows.filter(
        (row) =>
          row.full_name?.toLowerCase().includes(searchTerm) ||
          row.employee_no?.toLowerCase().includes(searchTerm) ||
          row.email?.toLowerCase().includes(searchTerm),
      );
    }

    const exactCount = search ? filteredRows.length : rows.length;

    res.json({
      employees: filteredRows.map((row) => toEmployeeApi(row, lookups, projectSitesMap.get(row.id) || 'Unassigned')),
      count: exactCount,
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

    const [employeeResult, lookups, projectSite] = await Promise.all([employeeQuery.maybeSingle(), getLookupMaps(), getEmployeeProjectSite(req.params.id)]);

    if (employeeResult.error) {
      throw employeeResult.error;
    }

    if (!employeeResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employee: toEmployeeApi(employeeResult.data as EmployeeRow, lookups, projectSite),
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
    const { fullName, firstName, lastName, email, department, position, status, salary, salaryBasis, hasSss, hasPagIbig, hasPhilHealth, hasSssLoan, hasTax, hasAdditionalDeduction, sssAmount, pagIbigAmount, philHealthAmount, sssLoanAmount, taxAmount, additionalDeductionAmount } = req.body;

    const cleanedFirstName = String(firstName || '').trim();
    const cleanedLastName = String(lastName || '').trim();
    const cleanedFullName = String(fullName || '').trim();

    if (!cleanedFirstName || !cleanedLastName) {
      return res.status(400).json({ message: 'firstName and lastName are required' });
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
    const employeeNo = `EMP-${Date.now()}`;
    const fullNameValue = cleanedFullName || `${cleanedLastName}, ${cleanedFirstName}`;

    const { data, error } = await supabase
      .from('employees')
      .insert({
        organization_id: organizationId,
        employee_no: employeeNo,
        first_name: cleanedFirstName,
        last_name: cleanedLastName,
        full_name: fullNameValue,
        email,
        department_id: departmentId,
        position_id: positionId,
        status: status || 'Active',
        salary: Number(salary) || 0,
        salary_basis: salaryBasis || 'monthly',
        has_sss: hasSss ?? true,
        has_pagibig: hasPagIbig ?? true,
        has_philhealth: hasPhilHealth ?? true,
        has_sss_loan: hasSssLoan ?? true,
        has_tax: hasTax ?? true,
        has_additional_deduction: hasAdditionalDeduction ?? true,
        sss_amount: normalizeAmount(sssAmount),
        pagibig_amount: normalizeAmount(pagIbigAmount),
        philhealth_amount: normalizeAmount(philHealthAmount),
        sss_loan_amount: normalizeAmount(sssLoanAmount),
        tax_amount: normalizeAmount(taxAmount),
        additional_deduction_amount: normalizeAmount(additionalDeductionAmount),
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

router.patch('/:id', async (req, res) => {
  try {
    const { fullName, firstName: incomingFirstName, lastName: incomingLastName, email, department, projectSite, position, status, salary, salaryBasis, hasSss, hasPagIbig, hasPhilHealth, hasSssLoan, hasTax, hasAdditionalDeduction, sssAmount, pagIbigAmount, philHealthAmount, sssLoanAmount, taxAmount, additionalDeductionAmount } = req.body || {};
    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    let employeeQuery = supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', req.params.id) as any;

    if (departmentIds !== null) {
      employeeQuery = employeeQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    const existingResult = await employeeQuery.maybeSingle();

    if (existingResult.error) {
      throw existingResult.error;
    }

    if (!existingResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const existing = existingResult.data as EmployeeRow;
    const organizationId = await getDefaultOrganizationId();
    const lookups = await getLookupMaps();
    const currentDepartmentName = existing.department_id
      ? lookups.departmentMap.get(existing.department_id) || 'Unassigned'
      : 'Unassigned';
    const currentPositionName = existing.position_id
      ? lookups.positionMap.get(existing.position_id) || 'Employee'
      : 'Employee';

    const nextDepartmentId = await getOrCreateDepartment(
      organizationId,
      canonicalDepartmentName(department || currentDepartmentName),
    );

    if (departmentIds !== null && !departmentIds.includes(nextDepartmentId)) {
      return res.status(403).json({ message: 'You can only update employees in your assigned department(s)' });
    }

    const nextPositionId = await getOrCreatePosition(
      organizationId,
      nextDepartmentId,
      position || currentPositionName,
    );

    const mergedFullName = String(fullName || existing.full_name || [existing.first_name, existing.last_name].filter(Boolean).join(' ')).trim();
    const { firstName, lastName } = splitFullName(mergedFullName);

    if (projectSite !== undefined) {
      const desiredProjectSite = String(projectSite || '').trim() || 'Main Office';
      const { data: projectSiteRecord, error: projectSiteError } = await supabase
        .from('project_sites')
        .select('id, name')
        .ilike('name', desiredProjectSite)
        .limit(1)
        .maybeSingle();

      if (projectSiteError) {
        throw projectSiteError;
      }

      const resolvedProjectSiteName = projectSiteRecord?.name || desiredProjectSite;
      if (resolvedProjectSiteName) {
        await setEmployeeProjectSite(existing.id, resolvedProjectSiteName);
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        first_name: firstName,
        last_name: lastName,
        email: email === undefined ? existing.email : (String(email || '').trim() || null),
        department_id: nextDepartmentId,
        position_id: nextPositionId,
        status: status || existing.status || 'Active',
        salary: salary === undefined ? Number(existing.salary || 0) : Number(salary) || 0,
        salary_basis: salaryBasis === undefined ? existing.salary_basis || 'monthly' : String(salaryBasis || 'monthly'),
        has_sss: hasSss === undefined ? existing.has_sss ?? true : Boolean(hasSss),
        has_pagibig: hasPagIbig === undefined ? existing.has_pagibig ?? true : Boolean(hasPagIbig),
        has_philhealth: hasPhilHealth === undefined ? existing.has_philhealth ?? true : Boolean(hasPhilHealth),
        has_sss_loan: hasSssLoan === undefined ? existing.has_sss_loan ?? true : Boolean(hasSssLoan),
        has_tax: hasTax === undefined ? existing.has_tax ?? true : Boolean(hasTax),
        has_additional_deduction: hasAdditionalDeduction === undefined ? existing.has_additional_deduction ?? true : Boolean(hasAdditionalDeduction),
        sss_amount: normalizeAmount(sssAmount === undefined ? existing.sss_amount : sssAmount),
        pagibig_amount: normalizeAmount(pagIbigAmount === undefined ? existing.pagibig_amount : pagIbigAmount),
        philhealth_amount: normalizeAmount(philHealthAmount === undefined ? existing.philhealth_amount : philHealthAmount),
        sss_loan_amount: normalizeAmount(sssLoanAmount === undefined ? existing.sss_loan_amount : sssLoanAmount),
        tax_amount: normalizeAmount(taxAmount === undefined ? existing.tax_amount : taxAmount),
        additional_deduction_amount: normalizeAmount(additionalDeductionAmount === undefined ? existing.additional_deduction_amount : additionalDeductionAmount),
      })
      .eq('id', req.params.id)
      .select(EMPLOYEE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    const refreshedLookups = await getLookupMaps();
    const refreshedProjectSite = await getEmployeeProjectSite(String(data.id));

    res.json({
      employee: toEmployeeApi(data as EmployeeRow, refreshedLookups, refreshedProjectSite),
    });
  } catch (error) {
  const message = (error as Error).message;
  if (message === 'Insufficient permissions') {
    return res.status(403).json({ message });
  }

  res.status(500).json({
    message: message || 'Failed to update employee in Supabase',
    error: message,
  });
}
});

router.patch('/:id/deactivate', async (req, res) => {
  try {
    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    let employeeQuery = supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', req.params.id) as any;

    if (departmentIds !== null) {
      employeeQuery = employeeQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    const existingResult = await employeeQuery.maybeSingle();

    if (existingResult.error) {
      throw existingResult.error;
    }

    if (!existingResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (departmentIds !== null) {
      const deptId = existingResult.data.department_id;
      if (deptId && !departmentIds.includes(deptId)) {
        return res.status(403).json({ message: 'You can only update employees in your assigned department(s)' });
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'Inactive' })
      .eq('id', req.params.id)
      .select(EMPLOYEE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    const lookups = await getLookupMaps();

    res.json({ employee: toEmployeeApi(data as EmployeeRow, lookups) });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to deactivate employee in Supabase',
      error: message,
    });
  }
});

router.patch('/:id/activate', async (req, res) => {
  try {
    const departmentIds = await getAllowedDepartmentIds(req as AuthRequest);

    let employeeQuery = supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', req.params.id) as any;

    if (departmentIds !== null) {
      employeeQuery = employeeQuery.in(
        'department_id',
        departmentIds.length > 0 ? departmentIds : ['00000000-0000-0000-0000-000000000000'],
      );
    }

    const existingResult = await employeeQuery.maybeSingle();

    if (existingResult.error) {
      throw existingResult.error;
    }

    if (!existingResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (departmentIds !== null) {
      const deptId = existingResult.data.department_id;
      if (deptId && !departmentIds.includes(deptId)) {
        return res.status(403).json({ message: 'You can only update employees in your assigned department(s)' });
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ status: 'Active' })
      .eq('id', req.params.id)
      .select(EMPLOYEE_SELECT)
      .single();

    if (error) {
      throw error;
    }

    const lookups = await getLookupMaps();

    res.json({ employee: toEmployeeApi(data as EmployeeRow, lookups) });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to activate employee in Supabase',
      error: message,
    });
  }
});

router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const existingResult = await supabase
      .from('employees')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (existingResult.error) {
      throw existingResult.error;
    }

    if (!existingResult.data) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const { error } = await supabase.from('employees').delete().eq('id', req.params.id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Employee deleted' });
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'Insufficient permissions') {
      return res.status(403).json({ message });
    }

    res.status(500).json({
      message: 'Failed to delete employee in Supabase',
      error: message,
    });
  }
});

export default router;
