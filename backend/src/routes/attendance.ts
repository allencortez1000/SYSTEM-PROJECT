import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

type AttendanceRow = {
  id: string;
  employee_id?: string | null;
  attendance_date: string;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  project_site?: string | null;
  period_mode?: string | null;
  worked_hours?: number | string | null;
  overtime_hours?: number | string | null;
  overtime_mode?: string | null;
  employees?: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
  } | null;
};

type ProjectSiteRow = {
  id: string;
  name: string;
};

type AssignmentRow = {
  employee_id: string;
  project_site_id: string;
  project_sites?: {
    name?: string | null;
  } | null;
};

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {
      firstName: 'Employee',
      lastName: 'Record',
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: 'Record',
    };
  }

  const lastName = parts[0];
  const firstName = parts.slice(1).join(' ');

  return {
    firstName,
    lastName,
  };
}

function formatSurnameFirst(firstName?: string | null, middleName?: string | null, lastName?: string | null, fallback?: string | null) {
  const first = String(firstName || '').trim();
  const middle = String(middleName || '').trim();
  const last = String(lastName || '').trim();

  const givenNames = [first, middle].filter(Boolean).join(' ').trim();
  if (last && givenNames) {
    return `${last}, ${givenNames}`;
  }

  return fallback || [first, middle, last].filter(Boolean).join(' ').trim() || 'Unknown employee';
}

function toAttendanceApi(row: AttendanceRow) {
  return {
    id: row.id,
    employeeId: row.employee_id || undefined,
    employeeName: formatSurnameFirst(
      row.employees?.first_name,
      row.employees?.middle_name,
      row.employees?.last_name,
      row.employees?.full_name,
    ),
    date: row.attendance_date,
    status: row.status,
    checkIn: row.check_in || undefined,
    checkOut: row.check_out || undefined,
    notes: row.notes || undefined,
    projectSite: row.project_site || undefined,
    periodMode: row.period_mode || undefined,
    workedHours: row.worked_hours === null || row.worked_hours === undefined ? undefined : Number(row.worked_hours),
    overtimeHours: row.overtime_hours === null || row.overtime_hours === undefined ? undefined : Number(row.overtime_hours),
    overtimeMode: row.overtime_mode || undefined,
  };
}

async function getDefaultOrganizationId() {
  const { data: existingOrg, error: existingOrgError } = await supabase
    .from('organizations')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existingOrgError) {
    throw existingOrgError;
  }

  if (existingOrg?.id) {
    return existingOrg.id as string;
  }

  const { data: newOrg, error: newOrgError } = await supabase
    .from('organizations')
    .insert({
      name: 'Demo Company',
      legal_name: 'Demo Company Philippines Inc.',
      currency: 'PHP',
    })
    .select('id')
    .single();

  if (newOrgError) {
    throw newOrgError;
  }

  return newOrg.id as string;
}

async function findOrCreateEmployeeByName(employeeName: string, patch?: {
  salary?: number | null;
  projectSite?: string | null;
}) {
  const name = employeeName.trim();

  const { data: existing, error: existingError } = await supabase
    .from('employees')
    .select('id')
    .ilike('full_name', name)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    if (patch) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          salary: patch.salary ?? null,
        })
        .eq('id', existing.id as string);

      if (updateError) {
        throw updateError;
      }
    }

    return existing.id as string;
  }

  const organizationId = await getDefaultOrganizationId();
  const { firstName, lastName } = splitFullName(name);

  const { data: created, error: createError } = await supabase
    .from('employees')
    .insert({
      organization_id: organizationId,
      employee_no: `EMP-${Date.now()}`,
      first_name: firstName,
      last_name: lastName,
      email: `${Date.now()}@placeholder.local`,
      status: 'Active',
      salary: patch?.salary ?? 0,
    })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  return created.id as string;
}

async function findOrCreateProjectSite(projectName: string) {
  const name = projectName.trim();
  if (!name) {
    throw new Error('Project site name is required');
  }

  const { data: existing, error: existingError } = await supabase
    .from('project_sites')
    .select('id, name')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    return existing as ProjectSiteRow;
  }

  const organizationId = await getDefaultOrganizationId();
  const { data: created, error: createError } = await supabase
    .from('project_sites')
    .insert({
      organization_id: organizationId,
      name,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (createError) {
    throw createError;
  }

  return created as ProjectSiteRow;
}

async function syncEmployeeProjectSite(employeeId: string, projectSiteName: string) {
  if (!projectSiteName || !projectSiteName.trim()) {
    return;
  }

  const project = await findOrCreateProjectSite(projectSiteName);

  const { data: currentAssignments } = await supabase
    .from('employee_project_deployments')
    .select('id, project_site_id')
    .eq('employee_id', employeeId)
    .eq('is_active', true);

  const alreadyAssigned = (currentAssignments || []).some(
    (assignment) => assignment.project_site_id === project.id
  );

  if (!alreadyAssigned) {
    if (currentAssignments && currentAssignments.length > 0) {
      await supabase
        .from('employee_project_deployments')
        .update({ is_active: false })
        .eq('employee_id', employeeId)
        .eq('is_active', true);
    }

    await supabase
      .from('employee_project_deployments')
      .insert({
        employee_id: employeeId,
        project_site_id: project.id,
        assigned_at: new Date().toISOString(),
        is_active: true,
      });
  }
}

router.get('/projects', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('project_sites')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      projects: (data || []).map((project) => ({ id: project.id as string, name: project.name as string })),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load project sites from Supabase',
      error: (error as Error).message,
    });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const { name } = req.body;
    const project = await findOrCreateProjectSite(String(name || ''));
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save project site in Supabase',
      error: (error as Error).message,
    });
  }
});

router.get('/assignments', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('employee_project_deployments')
      .select('employee_id, project_site_id, project_sites(name)')
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw error;
    }

    const assignments = (data || []).reduce<Record<string, string>>((accumulator, row) => {
      const assignment = row as AssignmentRow;
      if (assignment.employee_id && assignment.project_sites?.name) {
        accumulator[assignment.employee_id] = assignment.project_sites.name;
      }
      return accumulator;
    }, {});

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load project assignments from Supabase',
      error: (error as Error).message,
    });
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const { employeeId, projectName } = req.body;

    if (!employeeId || !projectName) {
      return res.status(400).json({ message: 'employeeId and projectName are required' });
    }

    const project = await findOrCreateProjectSite(String(projectName));

    const { data: currentAssignments, error: currentAssignmentsError } = await supabase
      .from('employee_project_deployments')
      .select('id, project_site_id')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (currentAssignmentsError) {
      throw currentAssignmentsError;
    }

    const activeAssignments = currentAssignments || [];
    const alreadyAssigned = activeAssignments.some((assignment) => assignment.project_site_id === project.id);

    if (!alreadyAssigned && activeAssignments.length > 0) {
      const idsToClose = activeAssignments.map((assignment) => assignment.id as string);
      const { error: closeError } = await supabase
        .from('employee_project_deployments')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .in('id', idsToClose);

      if (closeError) {
        throw closeError;
      }
    }

    if (!alreadyAssigned) {
      const { error: insertError } = await supabase
        .from('employee_project_deployments')
        .insert({
          employee_id: employeeId,
          project_site_id: project.id,
          assigned_at: new Date().toISOString(),
          is_active: true,
        });

      if (insertError) {
        throw insertError;
      }
    }

    res.status(201).json({
      assignment: {
        employeeId,
        projectName: project.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save project assignment in Supabase',
      error: (error as Error).message,
    });
  }
});

router.get('/', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees(full_name)
      `)
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      attendance: (data || []).map((row) => toAttendanceApi(row as AttendanceRow)),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load attendance from Supabase',
      error: (error as Error).message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      employeeId: employeeIdFromBody,
      employeeName,
      date,
      status,
      checkIn,
      checkOut,
      notes,
      projectSite,
      periodMode,
      workedHours,
      overtimeHours,
      overtimeMode,
    } = req.body;

    if (!employeeName || !date || !status) {
      return res.status(400).json({ message: 'employeeName, date and status are required' });
    }

    let employeeId = String(employeeIdFromBody || '').trim();
    if (employeeId) {
      const { data: existingEmployee, error: employeeLookupError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .maybeSingle();

      if (employeeLookupError) {
        throw employeeLookupError;
      }

      if (!existingEmployee?.id) {
        return res.status(400).json({ message: 'Employee not found for attendance save' });
      }
    } else {
      employeeId = await findOrCreateEmployeeByName(employeeName, {
        salary: Number(req.body?.salaryAmount ?? 0) || 0,
        projectSite: projectSite || null,
      });
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(
        {
          employee_id: employeeId,
          attendance_date: date,
          status,
          check_in: checkIn || null,
          check_out: checkOut || null,
          notes: notes || null,
          project_site: projectSite || null,
          period_mode: periodMode || null,
          worked_hours: workedHours ?? null,
          overtime_hours: overtimeHours ?? null,
          overtime_mode: overtimeMode || null,
        },
        {
          onConflict: 'employee_id,attendance_date',
        },
      )
      .select(`
        *,
        employees(full_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    if (projectSite && projectSite.trim()) {
      await syncEmployeeProjectSite(employeeId, projectSite);
    }

    if (!employeeIdFromBody) {
      await findOrCreateEmployeeByName(employeeName, {
        salary: Number(req.body?.salaryAmount ?? 0) || 0,
        projectSite: projectSite || null,
      });
    }

    res.status(201).json({
      record: toAttendanceApi(data as AttendanceRow),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save attendance in Supabase',
      error: (error as Error).message,
    });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { employeeId, employeeName, date } = req.body || {};

    if (!date || (!employeeId && !employeeName)) {
      return res.status(400).json({ message: 'employeeId or employeeName and date are required' });
    }

    let resolvedEmployeeId = String(employeeId || '').trim();
    if (!resolvedEmployeeId && employeeName) {
      resolvedEmployeeId = await findOrCreateEmployeeByName(String(employeeName));
    }

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('employee_id', resolvedEmployeeId)
      .eq('attendance_date', date);

    if (error) {
      throw error;
    }

    res.json({ message: 'Attendance deleted' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete attendance in Supabase',
      error: (error as Error).message,
    });
  }
});

export default router;
