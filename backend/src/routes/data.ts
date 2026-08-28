import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { requireSuperAdmin, verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

/*
  Generic read-only endpoints that surface raw rows from Supabase tables.
  Each endpoint selects all columns (*) so it never breaks on a column-name
  mismatch, and returns an empty list (200) if the table is empty or missing,
  so the frontend can always render gracefully.
*/

type Row = Record<string, unknown>;

function safeParseJson(value: unknown) {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(value: unknown) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

function extractNumberFromNotes(notes: unknown, pattern: RegExp) {
  const match = String(notes || '').match(pattern);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function departmentNameFromMap(departmentId: unknown, departmentMap: Map<string, string>) {
  if (!departmentId) return 'Unassigned';
  return departmentMap.get(String(departmentId)) || 'Unassigned';
}

async function fetchTable(table: string, orderColumn?: string, select = '*'): Promise<{ rows: Row[]; error: string | null }> {
  let query = supabase.from(table).select(select);

  if (orderColumn) {
    query = query.order(orderColumn, { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as unknown as Row[], error: null };
}

async function fetchDepartmentMap() {
  const { rows, error } = await fetchTable('departments', undefined, 'id, name');

  return {
    departmentMap: new Map(rows.map((department) => [String(department.id), String(department.name || 'Unassigned')])),
    error,
  };
}

// Expose departments list for frontend forms (id, name)
router.get('/departments', async (_, res) => {
  const { rows, error } = await fetchTable('departments', undefined, 'id, name');
  res.json({ departments: rows, error });
});

router.get('/leave', async (_, res) => {
  const { rows, error } = await fetchTable(
    'leave_requests',
    'created_at',
    '*, employees(full_name), leave_types(name)',
  );
  res.json({ leave: rows, error });
});

router.patch('/leave/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!id || !status) {
    res.status(400).json({ error: 'Missing id or status' });
    return;
  }
  const allowed = ['approved', 'rejected', 'pending'];
  if (!allowed.includes(String(status).toLowerCase())) {
    res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    return;
  }
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: String(status).toLowerCase(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ leave: data });
});

router.get('/leave-types', async (_, res) => {
  const { rows, error } = await fetchTable('leave_types');
  res.json({ leaveTypes: rows, error });
});

router.get('/payroll-runs', async (_, res) => {
  const { rows, error } = await fetchTable('payroll_runs', 'created_at');
  const payrollRuns = rows.map((run) => {
    const notes = safeParseJson(run.notes);
    const createdByName = String((notes as any)?.audit?.createdBy?.name || '').trim();
    return {
      ...run,
      created_by_name: createdByName || null,
    };
  });
  res.json({ payrollRuns, error });
});

router.get('/job-openings', async (_, res) => {
  const { rows, error } = await fetchTable('job_openings', 'created_at');
  res.json({ jobOpenings: rows, error });
});

router.get('/candidates', async (_, res) => {
  const { rows, error } = await fetchTable('candidates', 'created_at');
  res.json({ candidates: rows, error });
});

router.get('/compliance', async (_, res) => {
  const { rows, error } = await fetchTable('compliance_requirements', 'created_at');
  res.json({ compliance: rows, error });
});

router.get('/notifications', async (_, res) => {
  const { rows, error } = await fetchTable('notifications', 'created_at');
  res.json({ notifications: rows, error });
});

router.get('/reports/payroll-summary', async (_, res) => {
  const [runsResult, employeesResult, departmentsResult] = await Promise.all([
    fetchTable('payroll_runs', 'created_at'),
    fetchTable('employees', undefined, 'id, salary, department_id'),
    fetchDepartmentMap(),
  ]);

  const runs = runsResult.rows as Row[];
  const employees = employeesResult.rows as Row[];
  const payrollRuns = runs.map((run) => {
    const notes = String(run.notes || '');
    const sundayRestDayCount = extractNumberFromNotes(notes, /([\d.]+)\s+Sunday rest day\(s\)/i);
    const sundayOvertimeHours = extractNumberFromNotes(notes, /([\d.]+)\s+Sunday OT hour\(s\)/i);
    return {
      id: String(run.id || ''),
      runCode: String(run.run_code || ''),
      runType: String(run.run_type || ''),
      payPeriodLabel: String(run.pay_period_label || ''),
      payoutDate: String(run.payout_date || ''),
      status: String(run.status || 'Draft'),
      grossPayroll: numberValue(run.total_gross_pay),
      netPayout: numberValue(run.total_net_pay),
      sundayRestDayCount,
      sundayOvertimeHours,
      hasSundayPremium: sundayRestDayCount > 0 || sundayOvertimeHours > 0,
    };
  });

  const grossPayroll = payrollRuns.reduce((sum, run) => sum + run.grossPayroll, 0);
  const netPayout = payrollRuns.reduce((sum, run) => sum + run.netPayout, 0);
  const sssTotal = runs.reduce((sum, run) => sum + numberValue(run.total_sss), 0);
  const pagIbigTotal = runs.reduce((sum, run) => sum + numberValue(run.total_pagibig), 0);
  const philHealthTotal = runs.reduce((sum, run) => sum + numberValue(run.total_philhealth), 0);
  const otherDeductions = runs.reduce((sum, run) => sum + numberValue(run.total_other_deductions), 0);
  const totalSundayRestDays = payrollRuns.reduce((sum, run) => sum + run.sundayRestDayCount, 0);
  const totalSundayOtHours = payrollRuns.reduce((sum, run) => sum + run.sundayOvertimeHours, 0);
  const sundayPremiumRuns = payrollRuns.filter((run) => run.hasSundayPremium).length;

  const departments = Array.from(
    employees.reduce((map, employee) => {
      const name = departmentNameFromMap(employee.department_id, departmentsResult.departmentMap);
      const current = map.get(name) || { name, employees: 0, amount: 0 };
      current.employees += 1;
      current.amount += numberValue(employee.salary);
      map.set(name, current);
      return map;
    }, new Map<string, { name: string; employees: number; amount: number }>()).values(),
  ).sort((a, b) => b.amount - a.amount);

  res.json({
    metrics: {
      grossPayroll,
      netPayout,
      sssTotal,
      pagIbigTotal,
      philHealthTotal,
      otherDeductions,
      payrollRuns: runs.length,
      totalSundayRestDays,
      totalSundayOtHours,
      sundayPremiumRuns,
    },
    departments,
    payrollRuns,
    error: runsResult.error || employeesResult.error || departmentsResult.error,
  });
});

router.get('/reports/headcount-movement', async (_, res) => {
  const [employeesResult, departmentsResult] = await Promise.all([
    fetchTable(
      'employees',
      'created_at',
      'id, status, hire_date, termination_date, created_at, salary, department_id',
    ),
    fetchDepartmentMap(),
  ]);

  const employees = employeesResult.rows as Row[];
  const currentMonth = currentMonthKey();
  const totalEmployees = employees.length;
  const newHires = employees.filter((employee) => monthKey(employee.hire_date || employee.created_at) === currentMonth).length;
  // NOTE: termination_date is preferred; falls back to updated_at so only recently-terminated
  // employees are counted as exits this month rather than all historically terminated employees.
  const terminatedThisMonth = (employee: Row) => {
    if (String(employee.status || '').toLowerCase() !== 'terminated') return false;
    const dateStr = (employee.termination_date || employee.updated_at) as string | undefined;
    if (!dateStr) return false;
    return monthKey(dateStr) === currentMonth;
  };
  const exits = employees.filter(terminatedThisMonth).length;
  const activeEmployees = employees.filter((employee) => String(employee.status || 'Active').toLowerCase() === 'active').length;

  const departments = Array.from(
    employees.reduce((map, employee) => {
      const name = departmentNameFromMap(employee.department_id, departmentsResult.departmentMap);
      const current = map.get(name) || { department: name, start: 0, hired: 0, exited: 0, ending: 0 };
      const hiredThisMonth = monthKey(employee.hire_date || employee.created_at) === currentMonth;
      const exitedThisMonth = terminatedThisMonth(employee);
      if (hiredThisMonth) current.hired += 1;
      if (exitedThisMonth) current.exited += 1;
      if (!exitedThisMonth) current.ending += 1;
      current.start = Math.max(0, current.ending - current.hired + current.exited);
      map.set(name, current);
      return map;
    }, new Map<string, { department: string; start: number; hired: number; exited: number; ending: number }>()).values(),
  ).sort((a, b) => b.ending - a.ending);

  res.json({
    metrics: {
      totalEmployees,
      activeEmployees,
      newHires,
      exits,
      departments: departments.length,
    },
    departments,
    error: employeesResult.error || departmentsResult.error,
  });
});

router.get('/reports/attendance-insights', async (_, res) => {
  const [attendanceResult, employeesResult, departmentsResult] = await Promise.all([
    fetchTable(
      'attendance_records',
      'attendance_date',
      'id, employee_id, attendance_date, status, check_in, check_out',
    ),
    fetchTable('employees', undefined, 'id, department_id'),
    fetchDepartmentMap(),
  ]);

  const attendance = attendanceResult.rows as Row[];
  const employeeDepartmentMap = new Map(
    (employeesResult.rows as Row[]).map((employee) => [String(employee.id), employee.department_id]),
  );
  const totalRecords = attendance.length;
  const presentRecords = attendance.filter((record) => String(record.status || '').toLowerCase() === 'present').length;
  const absentRecords = attendance.filter((record) => String(record.status || '').toLowerCase() === 'absent').length;
  const remoteRecords = attendance.filter((record) => String(record.status || '').toLowerCase() === 'remote').length;
  const leaveRecords = attendance.filter((record) => String(record.status || '').toLowerCase() === 'leave').length;
  const presentRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 1000) / 10 : 0;

  const teams = Array.from(
    attendance.reduce((map, record) => {
      const departmentId = employeeDepartmentMap.get(String(record.employee_id));
      const team = departmentNameFromMap(departmentId, departmentsResult.departmentMap);
      const current = map.get(team) || { team, total: 0, presentCount: 0, absent: 0, remote: 0, leave: 0 };
      const status = String(record.status || '').toLowerCase();
      current.total += 1;
      if (status === 'present') current.presentCount += 1;
      if (status === 'absent') current.absent += 1;
      if (status === 'remote') current.remote += 1;
      if (status === 'leave') current.leave += 1;
      map.set(team, current);
      return map;
    }, new Map<string, { team: string; total: number; presentCount: number; absent: number; remote: number; leave: number }>()).values(),
  ).map((team) => ({
    team: team.team,
    presentRate: team.total > 0 ? Math.round((team.presentCount / team.total) * 1000) / 10 : 0,
    absent: team.absent,
    remote: team.remote,
    leave: team.leave,
  })).sort((a, b) => b.presentRate - a.presentRate);

  res.json({
    metrics: {
      totalRecords,
      presentRate,
      absences: absentRecords,
      remoteWork: remoteRecords,
      leaveRecords,
    },
    teams,
    error: attendanceResult.error || employeesResult.error || departmentsResult.error,
  });
});

router.get('/reports/compliance-packet', async (_, res) => {
  const [complianceResult, payrollResult] = await Promise.all([
    fetchTable('compliance_requirements', 'created_at'),
    fetchTable('payroll_runs', 'created_at'),
  ]);

  const compliance = complianceResult.rows as Row[];
  const payrollRuns = payrollResult.rows as Row[];
  const activeRequirements = compliance.filter((item) => item.is_active !== false);
  const latestPayrollRun = payrollRuns[0];

  const checklist = [
    {
      item: 'Monthly payroll report archived',
      owner: 'Payroll',
      status: latestPayrollRun ? 'Complete' : 'Pending',
    },
    {
      item: 'SSS, Pag-IBIG, PhilHealth summary reviewed',
      owner: 'Finance',
      status: payrollRuns.length > 0 ? 'Review' : 'Pending',
    },
    ...activeRequirements.slice(0, 8).map((requirement) => ({
      item: String(requirement.title || 'Compliance requirement'),
      owner: String(requirement.category || 'Compliance'),
      status: requirement.is_active === false ? 'Inactive' : 'Ready',
    })),
  ];

  res.json({
    metrics: {
      laborFilings: activeRequirements.length > 0 ? 'Ready' : 'Pending',
      policyAcknowledgements: `${activeRequirements.length} active`,
      payrollEvidence: latestPayrollRun ? 'Updated' : 'Missing',
      openRisks: activeRequirements.length,
    },
    checklist,
    error: complianceResult.error || payrollResult.error,
  });
});

router.get('/health', async (_, res) => {
  const [employeesResult, departmentsResult, deploymentsResult, attendanceResult, overridesResult] = await Promise.all([
    fetchTable('employees', 'created_at', 'id, employee_no, first_name, middle_name, last_name, full_name, status, salary, department_id'),
    fetchDepartmentMap(),
    fetchTable('employee_project_deployments', 'assigned_at', 'employee_id, is_active, assigned_at, project_sites(name)'),
    fetchTable('attendance_records', 'attendance_date', 'id, employee_id, attendance_date, status, project_site, overtime_hours'),
    fetchTable('payroll_attendance_overrides', 'period_start', 'employee_id, project_site, period_start, period_end, paid_days_override, overtime_hours_override, remarks'),
  ]);

  const employees = employeesResult.rows as Row[];
  const attendance = attendanceResult.rows as Row[];
  const overrides = overridesResult.rows as Row[];
  const employeeIds = new Set(employees.map((employee) => String(employee.id || '')).filter(Boolean));

  const activeDeploymentByEmployee = new Map<string, string>();
  for (const deployment of deploymentsResult.rows as Row[]) {
    if (deployment.is_active === false) continue;
    const employeeId = String(deployment.employee_id || '').trim();
    if (!employeeId || activeDeploymentByEmployee.has(employeeId)) continue;
    const projectSiteName = String((deployment.project_sites as { name?: string } | null | undefined)?.name || '').trim();
    activeDeploymentByEmployee.set(employeeId, projectSiteName || 'Unassigned');
  }

  const employeeDetails = employees.map((employee) => {
    const id = String(employee.id || '').trim();
    const firstName = String(employee.first_name || '').trim();
    const middleName = String(employee.middle_name || '').trim();
    const lastName = String(employee.last_name || '').trim();
    const fullName = String(employee.full_name || '').trim() || [lastName, firstName, middleName].filter(Boolean).join(', ') || 'Unnamed employee';
    const department = departmentNameFromMap(employee.department_id, departmentsResult.departmentMap);
    const salary = numberValue(employee.salary);
    const projectSite = activeDeploymentByEmployee.get(id) || 'Unassigned';
    const status = String(employee.status || 'Active');
    return {
      id,
      employeeNo: String(employee.employee_no || '').trim(),
      name: fullName,
      department,
      status,
      salary,
      projectSite,
    };
  });

  const missingSalaryEmployees = employeeDetails
    .filter((employee) => String(employee.status || '').toLowerCase() === 'active' && employee.salary <= 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const missingProjectSiteEmployees = employeeDetails
    .filter((employee) => String(employee.status || '').toLowerCase() === 'active' && (!employee.projectSite || employee.projectSite === 'Unassigned'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const attendanceMissingProjectSite = attendance
    .filter((record) => !String(record.project_site || '').trim())
    .map((record) => ({
      id: String(record.id || ''),
      employeeId: String(record.employee_id || '').trim(),
      date: String(record.attendance_date || ''),
      status: String(record.status || ''),
      overtimeHours: numberValue(record.overtime_hours),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const attendanceUnlinkedEmployees = attendance
    .filter((record) => !String(record.employee_id || '').trim())
    .map((record) => ({
      id: String(record.id || ''),
      date: String(record.attendance_date || ''),
      status: String(record.status || ''),
      projectSite: String(record.project_site || '').trim(),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const overrideIssues = overrides
    .map((override) => {
      const employeeId = String(override.employee_id || '').trim();
      const projectSite = String(override.project_site || '').trim();
      const periodStart = String(override.period_start || '').trim();
      const periodEnd = String(override.period_end || '').trim();
      const paidDaysOverride = numberValue(override.paid_days_override);
      const overtimeHoursOverride = numberValue(override.overtime_hours_override);
      const problems = [
        !employeeId ? 'Missing employee' : '',
        employeeId && !employeeIds.has(employeeId) ? 'Employee no longer exists' : '',
        !projectSite ? 'Missing project site' : '',
        !periodStart || !periodEnd ? 'Missing covered period' : '',
        paidDaysOverride < 0 ? 'Negative paid days override' : '',
        overtimeHoursOverride < 0 ? 'Negative overtime override' : '',
      ].filter(Boolean);

      return {
        employeeId,
        projectSite,
        periodStart,
        periodEnd,
        remarks: String(override.remarks || '').trim(),
        problems,
      };
    })
    .filter((override) => override.problems.length > 0)
    .sort((a, b) => `${b.periodStart}${b.periodEnd}`.localeCompare(`${a.periodStart}${a.periodEnd}`));

  const issuesByDepartment = Array.from(
    employeeDetails.reduce((map, employee) => {
      const current = map.get(employee.department) || { department: employee.department, missingSalary: 0, missingProjectSite: 0, totalFlags: 0 };
      if (String(employee.status || '').toLowerCase() === 'active' && employee.salary <= 0) {
        current.missingSalary += 1;
        current.totalFlags += 1;
      }
      if (String(employee.status || '').toLowerCase() === 'active' && (!employee.projectSite || employee.projectSite === 'Unassigned')) {
        current.missingProjectSite += 1;
        current.totalFlags += 1;
      }
      map.set(employee.department, current);
      return map;
    }, new Map<string, { department: string; missingSalary: number; missingProjectSite: number; totalFlags: number }>()).values(),
  ).sort((a, b) => b.totalFlags - a.totalFlags || a.department.localeCompare(b.department));

  res.json({
    metrics: {
      activeEmployees: employeeDetails.filter((employee) => String(employee.status || '').toLowerCase() === 'active').length,
      employeesMissingSalary: missingSalaryEmployees.length,
      employeesMissingProjectSite: missingProjectSiteEmployees.length,
      attendanceMissingProjectSite: attendanceMissingProjectSite.length,
      attendanceUnlinkedEmployees: attendanceUnlinkedEmployees.length,
      overrideIssues: overrideIssues.length,
      totalIssues: missingSalaryEmployees.length + missingProjectSiteEmployees.length + attendanceMissingProjectSite.length + attendanceUnlinkedEmployees.length + overrideIssues.length,
    },
    issuesByDepartment,
    missingSalaryEmployees,
    missingProjectSiteEmployees,
    attendanceMissingProjectSite,
    attendanceUnlinkedEmployees,
    overrideIssues,
    recommendations: [
      'Complete missing salary values before the next payroll run.',
      'Assign active employees to a valid project site so attendance and payroll stay aligned.',
      'Require project site selection when encoding attendance for project-based teams.',
      'Review payroll attendance overrides that are incomplete or reference removed employees.',
    ],
    error: employeesResult.error || departmentsResult.error || deploymentsResult.error || attendanceResult.error || overridesResult.error,
  });
});

export default router;
