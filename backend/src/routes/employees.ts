import { Router } from 'express';
import { hasEmployeeAccess } from '../lib/appUser';
import { supabase } from '../lib/supabase';
import { canonicalDepartmentName } from '../lib/departmentNames';
import { RequestValidationError, isRequestValidationError, normalizeBoolean, optionalNullableTrimmedString, optionalTrimmedString, requireTrimmedString } from '../lib/validation';
import { AuthRequest, requireModuleAccess, requireSuperAdmin, verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.use(requireModuleAccess('employees'));

const EMPLOYEE_STATUS_OPTIONS = ['Active', 'Onboarding', 'On Leave', 'Inactive', 'Terminated'] as const;

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
  const trimmed = String(fullName || '').trim();
  if (!trimmed) {
    return {
      firstName: 'Employee',
      middleName: '',
      lastName: 'Record',
    };
  }

  if (trimmed.includes(',')) {
    const [lastPart, restPart] = trimmed.split(',', 2);
    const lastName = String(lastPart || '').trim() || 'Record';
    const givenParts = String(restPart || '').trim().split(/\s+/).filter(Boolean);
    const firstName = givenParts.shift() || 'Employee';
    const middleName = givenParts.join(' ');

    return {
      firstName,
      middleName,
      lastName,
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Employee';
  const lastName = parts.length ? parts.pop() || 'Record' : 'Record';
  const middleName = parts.join(' ');

  return {
    firstName,
    middleName,
    lastName,
  };
}

function normalizeAmount(value: unknown) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateEmployeePayload(payload: Record<string, unknown>, options?: { partial?: boolean }) {
  const errors: Record<string, string> = {};
  const partial = Boolean(options?.partial);

  const fullName = String(payload.fullName || '').trim();
  const email = String(payload.email || '').trim();
  const employeeId = String(payload.employeeId || '').trim();
  const salary = payload.salary;
  const salaryBasis = String(payload.salaryBasis || '').trim().toLowerCase();
  const status = String(payload.status || '').trim();

  if (!partial || payload.fullName !== undefined) {
    if (!fullName) {
      errors.fullName = 'Full name is required';
    }
  }

  if (!partial || payload.email !== undefined) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  if (!partial || payload.employeeId !== undefined) {
    if (employeeId.length > 0 && employeeId.length < 3) {
      errors.employeeId = 'Employee ID must be at least 3 characters';
    }
  }

  if (!partial || payload.salary !== undefined) {
    const parsedSalary = Number(salary);
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
      errors.salary = 'Salary must be a valid non-negative number';
    }
  }

  if (!partial || payload.salaryBasis !== undefined) {
    if (salaryBasis && !['monthly', 'daily'].includes(salaryBasis)) {
      errors.salaryBasis = 'Salary basis must be monthly or daily';
    }
  }

  if (!partial || payload.status !== undefined) {
    if (status && !EMPLOYEE_STATUS_OPTIONS.includes(status as (typeof EMPLOYEE_STATUS_OPTIONS)[number])) {
      errors.status = 'Status must be one of the supported employee statuses';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new RequestValidationError('Please fix the highlighted fields', 422, errors);
  }
}

function formatDisplayName(row: EmployeeRow) {
  const firstName = String(row.first_name || '').trim();
  const middleName = String(row.middle_name || '').trim();
  const lastName = String(row.last_name || '').trim();
  const normalizedFullName = String(row.full_name || '').trim();

  const structuredName = [lastName, firstName, middleName].filter(Boolean).join(', ').replace(/,\s*,/g, ', ').trim();
  if (structuredName && structuredName !== ',') {
    return structuredName;
  }

  if (normalizedFullName) {
    return normalizedFullName;
  }

  return 'Unnamed employee';
}

function toEmployeeApi(row: EmployeeRow, lookups: LookupMaps, projectSite = 'Unassigned') {
  return {
    id: row.id,
    employeeId: row.employee_no,
    fullName: formatDisplayName(row),
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

  // Sub-admins: allow full access if they have admin_access or employees permission
  if (req.user.role === 'sub-admin') {
    const { data: userRows, error: userError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', req.user.userId)
      .limit(1);

    if (userError) throw userError;
    const userRow = userRows && userRows[0];

    if (hasEmployeeAccess(userRow as Record<string, unknown> | null)) {
      // Give access to all departments for sub-admins with dashboard/admin or employee access
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
    validateEmployeePayload(req.body || {});

    const { fullName, firstName, lastName, email, department, projectSite, position, status, salary, salaryBasis, employeeId, hasSss, hasPagIbig, hasPhilHealth, hasSssLoan, hasTax, hasAdditionalDeduction, sssAmount, pagIbigAmount, philHealthAmount, sssLoanAmount, taxAmount, additionalDeductionAmount } = req.body;

    const cleanedFullName = optionalTrimmedString(fullName);
    const derivedName = cleanedFullName ? splitFullName(cleanedFullName) : null;
    const cleanedFirstName = optionalTrimmedString(firstName) || derivedName?.firstName || 'Employee';
    const cleanedLastName = optionalTrimmedString(lastName) || derivedName?.lastName || 'Record';
    const cleanedMiddleName = derivedName?.middleName || '';
    const canonicalFullName = cleanedFullName || [cleanedLastName, cleanedFirstName, cleanedMiddleName].filter(Boolean).join(', ');

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
    const employeeNo = optionalTrimmedString(employeeId) || `EMP-${Date.now()}`;
    const { data, error } = await supabase
      .from('employees')
      .insert({
        organization_id: organizationId,
        employee_no: employeeNo,
        first_name: cleanedFirstName,
        middle_name: cleanedMiddleName || null,
        last_name: cleanedLastName,
        full_name: canonicalFullName,
        email: optionalNullableTrimmedString(email),
        department_id: departmentId,
        position_id: positionId,
        status: optionalTrimmedString(status, 'Active'),
        salary: Number(salary) || 0,
        salary_basis: optionalTrimmedString(salaryBasis, 'monthly'),
        has_sss: normalizeBoolean(hasSss, true),
        has_pagibig: normalizeBoolean(hasPagIbig, true),
        has_philhealth: normalizeBoolean(hasPhilHealth, true),
        has_sss_loan: normalizeBoolean(hasSssLoan, true),
        has_tax: normalizeBoolean(hasTax, true),
        has_additional_deduction: normalizeBoolean(hasAdditionalDeduction, true),
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

    if (projectSite !== undefined) {
      await setEmployeeProjectSite((data as EmployeeRow).id, String(projectSite || ''));
    }

    const lookups = await getLookupMaps();
    const resolvedProjectSite = await getEmployeeProjectSite((data as EmployeeRow).id);

    res.status(201).json({
      employee: toEmployeeApi(data as EmployeeRow, lookups, resolvedProjectSite),
    });
  } catch (error) {
    if (isRequestValidationError(error)) {
      return res.status(error.statusCode).json({ message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
    }
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
    validateEmployeePayload(req.body || {}, { partial: true });

    const { fullName, firstName: incomingFirstName, lastName: incomingLastName, email, department, projectSite, position, status, salary, salaryBasis, employeeId, hasSss, hasPagIbig, hasPhilHealth, hasSssLoan, hasTax, hasAdditionalDeduction, sssAmount, pagIbigAmount, philHealthAmount, sssLoanAmount, taxAmount, additionalDeductionAmount } = req.body || {};
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

    const mergedFullName = String(fullName || existing.full_name || [existing.last_name, existing.first_name, existing.middle_name].filter(Boolean).join(', ')).trim();
    const { firstName, middleName, lastName } = splitFullName(mergedFullName);

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
        middle_name: middleName || existing.middle_name || null,
        last_name: lastName,
        employee_no: employeeId === undefined ? existing.employee_no : optionalTrimmedString(employeeId, existing.employee_no),
        email: email === undefined ? existing.email : optionalNullableTrimmedString(email),
        department_id: nextDepartmentId,
        position_id: nextPositionId,
        status: status === undefined ? existing.status || 'Active' : optionalTrimmedString(status, 'Active'),
        salary: salary === undefined ? Number(existing.salary || 0) : Number(salary) || 0,
        salary_basis: salaryBasis === undefined ? existing.salary_basis || 'monthly' : optionalTrimmedString(salaryBasis, 'monthly'),
        has_sss: hasSss === undefined ? existing.has_sss ?? true : normalizeBoolean(hasSss, true),
        has_pagibig: hasPagIbig === undefined ? existing.has_pagibig ?? true : normalizeBoolean(hasPagIbig, true),
        has_philhealth: hasPhilHealth === undefined ? existing.has_philhealth ?? true : normalizeBoolean(hasPhilHealth, true),
        has_sss_loan: hasSssLoan === undefined ? existing.has_sss_loan ?? true : normalizeBoolean(hasSssLoan, true),
        has_tax: hasTax === undefined ? existing.has_tax ?? true : normalizeBoolean(hasTax, true),
        has_additional_deduction: hasAdditionalDeduction === undefined ? existing.has_additional_deduction ?? true : normalizeBoolean(hasAdditionalDeduction, true),
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
    if (isRequestValidationError(error)) {
      return res.status(error.statusCode).json({ message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
    }
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
