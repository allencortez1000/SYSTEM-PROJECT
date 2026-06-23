import { Router } from 'express';
import { calculatePayroll, computeGovernmentContributions } from '../controllers/payroll';
import { supabase } from '../lib/supabase';

const router = Router();

router.post('/calculate', (req, res) => {
  try {
    const result = calculatePayroll(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: 'Invalid payroll payload', error: (error as Error).message });
  }
});

type AttendanceSummary = {
  employeeId?: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  projectSite?: string;
  presentDays: number;
  remoteDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
  paidDays: number;
  basePaidDays?: number;
  regularHours: number;
  overtimeHours: number;
  baseOvertimeHours?: number;
  totalRecords: number;
  overrideApplied?: boolean;
};

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string | null;
  check_in?: string | null;
  check_out?: string | null;
  worked_hours?: number | string | null;
  overtime_hours?: number | string | null;
  project_site?: string | null;
};

type PayrollOverrideRow = {
  employee_id: string;
  project_site: string;
  period_start: string;
  period_end: string;
  paid_days_override?: number | string | null;
  overtime_hours_override?: number | string | null;
  salary_amount?: number | string | null;
  ot_pay?: number | string | null;
  philhealth_amount?: number | string | null;
  sss_amount?: number | string | null;
  pagibig_amount?: number | string | null;
  total_salary?: number | string | null;
  total_deduction?: number | string | null;
  net_salary?: number | string | null;
  cash_advance?: number | string | null;
  tax_amount?: number | string | null;
  additional_deduction?: number | string | null;
  remarks?: string | null;
};

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function workedHoursFromRecord(record: AttendanceRecord) {
  if (record.worked_hours !== null && record.worked_hours !== undefined) {
    const worked = Number(record.worked_hours);
    return Number.isFinite(worked) ? worked : 0;
  }

  const parseTime = (value?: string | null) => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const checkIn = parseTime(record.check_in);
  const checkOut = parseTime(record.check_out);
  if (checkIn === null || checkOut === null || checkOut <= checkIn) return 0;
  return roundCurrency((checkOut - checkIn) / 60);
}

function overtimeHoursFromRecord(record: AttendanceRecord) {
  if (record.overtime_hours !== null && record.overtime_hours !== undefined) {
    const overtime = Number(record.overtime_hours);
    return Number.isFinite(overtime) ? overtime : 0;
  }

  return Math.max(0, roundCurrency(workedHoursFromRecord(record) - 8));
}

router.get('/attendance-summary', async (req, res) => {
  try {
    const employeeName = String(req.query.employeeName || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();
    const projectSite = String(req.query.projectSite || '').trim();

    if (!employeeName || !startDate || !endDate) {
      return res.status(400).json({
        message: 'employeeName, startDate, and endDate are required',
      });
    }

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name')
      .ilike('full_name', employeeName)
      .limit(1);

    if (empError) throw empError;
    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: `No employee found for "${employeeName}"` });
    }

    const employee = employees[0] as { id: string; full_name?: string | null };
    let attendanceQuery = supabase
      .from('attendance_records')
      .select('id, attendance_date, status, check_in, check_out, worked_hours, overtime_hours, project_site')
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (projectSite) {
      attendanceQuery = attendanceQuery.eq('project_site', projectSite);
    }

    const { data: records, error: attendanceError } = await attendanceQuery;

    if (attendanceError) throw attendanceError;

    const summary = summarizeAttendance(
      (records || []) as AttendanceRecord[],
      employee.full_name || employeeName,
      startDate,
      endDate,
      employee.id,
      projectSite || undefined,
    );

    const { data: overrideRows, error: overrideError } = await supabase
      .from('payroll_attendance_overrides')
      .select('employee_id, project_site, period_start, period_end, paid_days_override, overtime_hours_override, salary_amount, ot_pay, philhealth_amount, sss_amount, pagibig_amount, total_salary, total_deduction, net_salary, cash_advance, tax_amount, additional_deduction, remarks')
      .eq('employee_id', employee.id)
      .eq('project_site', projectSite || summary.projectSite || '')
      .eq('period_start', startDate)
      .eq('period_end', endDate)
      .limit(1);

    if (overrideError) throw overrideError;

    const override = (overrideRows?.[0] || null) as PayrollOverrideRow | null;
    const finalSummary = applyAttendanceOverride(summary, override);

    res.json({ summary: finalSummary, override });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load attendance summary from Supabase',
      error: (error as Error).message,
    });
  }
});

router.get('/project-sync', async (req, res) => {
  try {
    const projectSite = String(req.query.projectSite || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();

    if (!projectSite || !startDate || !endDate) {
      return res.status(400).json({ message: 'projectSite, startDate, and endDate are required' });
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('employee_project_deployments')
      .select('employee_id, project_sites!inner(name)')
      .eq('is_active', true)
      .eq('project_sites.name', projectSite);

    if (assignmentsError) throw assignmentsError;

    const employeeIds = Array.from(new Set((assignments || []).map((row: any) => String(row.employee_id)).filter(Boolean)));
    if (employeeIds.length === 0) {
      return res.json({ workers: [] });
    }

    const [employeesResult, positionsResult, attendanceResult, overridesResult] = await Promise.all([
      supabase.from('employees').select('id, full_name, salary, salary_basis, position_id').in('id', employeeIds),
      supabase.from('job_positions').select('id, title'),
      supabase
        .from('attendance_records')
        .select('id, employee_id, attendance_date, status, check_in, check_out, worked_hours, overtime_hours, project_site')
        .in('employee_id', employeeIds)
        .eq('project_site', projectSite)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true }),
      supabase
        .from('payroll_attendance_overrides')
        .select('employee_id, project_site, period_start, period_end, paid_days_override, overtime_hours_override, remarks')
        .in('employee_id', employeeIds)
        .eq('project_site', projectSite)
        .eq('period_start', startDate)
        .eq('period_end', endDate),
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (positionsResult.error) throw positionsResult.error;
    if (attendanceResult.error) throw attendanceResult.error;
    if (overridesResult.error) throw overridesResult.error;

    const positionMap = new Map((positionsResult.data || []).map((row) => [String(row.id), String(row.title || 'Employee')]));
    const attendanceByEmployee = new Map<string, AttendanceRecord[]>();
    for (const record of (attendanceResult.data || []) as any[]) {
      const employeeId = String(record.employee_id);
      const current = attendanceByEmployee.get(employeeId) || [];
      current.push(record as AttendanceRecord);
      attendanceByEmployee.set(employeeId, current);
    }

    const overrideMap = new Map<string, PayrollOverrideRow>();
    for (const row of (overridesResult.data || []) as PayrollOverrideRow[]) {
      overrideMap.set(String(row.employee_id), row);
    }

    const workers = ((employeesResult.data || []) as any[])
      .map((employee) => {
        const baseSummary = summarizeAttendance(
          attendanceByEmployee.get(String(employee.id)) || [],
          String(employee.full_name || 'Unknown employee'),
          startDate,
          endDate,
          String(employee.id),
          projectSite,
        );
        const finalSummary = applyAttendanceOverride(baseSummary, overrideMap.get(String(employee.id)) || null);
        const salary = employee.salary ? Number(employee.salary) : 0;
        const salaryBasis = String((employee as any).salary_basis || 'monthly').toLowerCase();
        const dailyRate = salaryBasis === 'daily' ? roundCurrency(salary || 0) : salary ? roundCurrency(salary / 26) : 600;
        return {
          employeeId: String(employee.id),
          employeeName: String(employee.full_name || ''),
          position: positionMap.get(String(employee.position_id || '')) || 'Employee',
          dailyRate,
          attendance: finalSummary,
          remarks: overrideMap.get(String(employee.id))?.remarks || buildAttendanceRemarks(finalSummary) || '',
          payrollSnapshot: overrideMap.get(String(employee.id))
            ? {
                salaryAmount: overrideMap.get(String(employee.id))?.salary_amount ?? null,
                otPay: overrideMap.get(String(employee.id))?.ot_pay ?? null,
                philHealthAmount: overrideMap.get(String(employee.id))?.philhealth_amount ?? null,
                sssAmount: overrideMap.get(String(employee.id))?.sss_amount ?? null,
                pagIbigAmount: overrideMap.get(String(employee.id))?.pagibig_amount ?? null,
                totalSalary: overrideMap.get(String(employee.id))?.total_salary ?? null,
                totalDeduction: overrideMap.get(String(employee.id))?.total_deduction ?? null,
                netSalary: overrideMap.get(String(employee.id))?.net_salary ?? null,
                cashAdvance: overrideMap.get(String(employee.id))?.cash_advance ?? null,
                taxAmount: overrideMap.get(String(employee.id))?.tax_amount ?? null,
                additionalDeduction: overrideMap.get(String(employee.id))?.additional_deduction ?? null,
              }
            : null,
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    res.json({ workers });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to sync payroll workers from attendance',
      error: (error as Error).message,
    });
  }
});

router.post('/attendance-overrides', async (req, res) => {
  try {
    const {
      employeeId,
      projectSite,
      startDate,
      endDate,
      paidDaysOverride,
      overtimeHoursOverride,
      salaryAmount,
      otPay,
      philhealthAmount,
      sssAmount,
      pagibigAmount,
      totalSalary,
      totalDeduction,
      netSalary,
      cashAdvance,
      taxAmount,
      additionalDeduction,
      remarks,
    } = req.body;

    if (!employeeId || !projectSite || !startDate || !endDate) {
      return res.status(400).json({ message: 'employeeId, projectSite, startDate, and endDate are required' });
    }

    const { data, error } = await supabase
      .from('payroll_attendance_overrides')
      .upsert({
        employee_id: employeeId,
        project_site: projectSite,
        period_start: startDate,
        period_end: endDate,
        paid_days_override: paidDaysOverride ?? null,
        overtime_hours_override: overtimeHoursOverride ?? null,
        salary_amount: salaryAmount ?? null,
        ot_pay: otPay ?? null,
        philhealth_amount: philhealthAmount ?? null,
        sss_amount: sssAmount ?? null,
        pagibig_amount: pagibigAmount ?? null,
        total_salary: totalSalary ?? null,
        total_deduction: totalDeduction ?? null,
        net_salary: netSalary ?? null,
        cash_advance: cashAdvance ?? null,
        tax_amount: taxAmount ?? null,
        additional_deduction: additionalDeduction ?? null,
        remarks: remarks || null,
      }, {
        onConflict: 'employee_id,project_site,period_start,period_end',
      })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({ override: data });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save payroll attendance override',
      error: (error as Error).message,
    });
  }
});

router.post('/save', async (req, res) => {
  try {
    const {
      employeeName,
      payPeriod,
      payBasis,
      payFrequency,
      payoutDay,
      firstCutoffDay,
      secondCutoffDay,
      rate,
      units,
      overtimeHours,
      overtimeRate,
      bonus,
      allowances,
      loanDeduction,
      basicSalary,
      grossEarnings,
      attendanceSummary,
    } = req.body;

    // 1. Get default organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Demo Company')
      .order('created_at', { ascending: true })
      .limit(1);

    if (orgError) throw orgError;
    if (!orgs || orgs.length === 0) {
      return res.status(400).json({ message: 'No organization found' });
    }
    const organizationId = orgs[0].id as string;

    // 2. Generate unique run_code
    const now = new Date();
    const runCode = `PR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now()}`;

    // 3. Compute pay period dates. If payroll was linked to attendance,
    // use that attendance date range so Supabase stores the same payroll window
    // the user reviewed in the UI.
    const attendance = attendanceSummary as Partial<AttendanceSummary> | null | undefined;
    const periodStart = attendance?.startDate || now.toISOString().slice(0, 8) + '01';
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const periodEnd = attendance?.endDate || now.toISOString().slice(0, 8) + String(lastDay).padStart(2, '0');

    // 4. Compute payout_date from schedule
    let payoutDate: string;
    if (payFrequency === 'monthly') {
      const day = payoutDay === 'EOM' ? lastDay : Math.min(Number(payoutDay), lastDay);
      payoutDate = now.toISOString().slice(0, 8) + String(day).padStart(2, '0');
    } else {
      // semi-monthly: use second cutoff day
      const day = secondCutoffDay === 'EOM' ? lastDay : Math.min(Number(secondCutoffDay), lastDay);
      payoutDate = now.toISOString().slice(0, 8) + String(day).padStart(2, '0');
    }

    const gross = roundCurrency(Number(grossEarnings) || 0);
    const loan = roundCurrency(Number(loanDeduction) || 0);
    const basic = roundCurrency(Number(basicSalary) || 0);
    const overtimeHourCount = Number(overtimeHours) || 0;
    const overtimeHourlyRate = Number(overtimeRate) || 0;
    const computedContributions = computeGovernmentContributions(gross);
    const totalDeductions = roundCurrency(computedContributions.totalEmployeeDeduction + loan);
    const netPay = roundCurrency(Math.max(0, gross - totalDeductions));
    const employerCost = roundCurrency(gross + computedContributions.totalEmployerContribution);

    // 5. Insert payroll_run
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .insert({
        organization_id: organizationId,
        run_code: runCode,
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        payout_date: payoutDate,
        status: 'Draft',
        total_gross_pay: gross,
        total_sss: computedContributions.sss.employee,
        total_pagibig: computedContributions.pagIbig.employee,
        total_philhealth: computedContributions.philHealth.employee,
        total_other_deductions: loan,
        total_deductions: totalDeductions,
        total_net_pay: netPay,
        total_employer_cost: employerCost,
        pay_basis: payBasis,
        pay_frequency: payFrequency,
        payout_day: payFrequency === 'monthly' ? payoutDay : null,
        second_payout_day: payFrequency === 'semi-monthly' ? secondCutoffDay : null,
        pay_period_label: payPeriod,
        notes: buildPayrollNotes(payBasis, payFrequency, payoutDay, firstCutoffDay, secondCutoffDay, attendanceSummary),
      })
      .select('id')
      .single();

    if (runError) throw runError;
    const payrollRunId = run.id as string;

    // 6. Try to find employee by name, insert payroll_item if found
    if (employeeName && employeeName.trim()) {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .ilike('full_name', employeeName.trim())
        .limit(1);

      if (!empError && employees && employees.length > 0) {
        const employeeId = employees[0].id as string;

        await supabase.from('payroll_items').insert({
          payroll_run_id: payrollRunId,
          employee_id: employeeId,
          hourly_rate: Number(rate) || 0,
          regular_hours: Number(units) || 0,
          regular_pay: basic,
          overtime_hours: overtimeHourCount,
          overtime_rate: overtimeHourlyRate,
          overtime_pay: roundCurrency(overtimeHourCount * overtimeHourlyRate),
          allowances: Number(allowances) || 0,
          bonus: Number(bonus) || 0,
          gross_pay: gross,
          sss_deduction: computedContributions.sss.employee,
          pagibig_deduction: computedContributions.pagIbig.employee,
          philhealth_deduction: computedContributions.philHealth.employee,
          other_deductions: loan,
          total_deductions: totalDeductions,
          net_pay: netPay,
          employer_cost: employerCost,
          remarks: buildAttendanceRemarks(attendanceSummary),
        });
      }
    }

    res.status(201).json({
      message: 'Payroll run saved to Supabase',
      runCode,
      runId: payrollRunId,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save payroll run',
      error: (error as Error).message,
    });
  }
});

function summarizeAttendance(
  records: AttendanceRecord[],
  employeeName: string,
  startDate: string,
  endDate: string,
  employeeId?: string,
  projectSite?: string,
): AttendanceSummary {
  const summary: AttendanceSummary = {
    employeeId,
    employeeName,
    startDate,
    endDate,
    projectSite,
    presentDays: 0,
    remoteDays: 0,
    leaveDays: 0,
    absentDays: 0,
    lateDays: 0,
    paidDays: 0,
    regularHours: 0,
    overtimeHours: 0,
    totalRecords: records.length,
  };

  for (const record of records) {
    const status = String(record.status || '').toLowerCase();

    if (status === 'present') summary.presentDays += 1;
    if (status === 'remote') summary.remoteDays += 1;
    if (status === 'leave') summary.leaveDays += 1;
    if (status === 'absent') summary.absentDays += 1;
    if (status === 'late') summary.lateDays += 1;
    summary.overtimeHours += overtimeHoursFromRecord(record);
  }

  summary.paidDays = summary.presentDays + summary.remoteDays + summary.leaveDays + summary.lateDays;
  summary.basePaidDays = summary.paidDays;
  summary.baseOvertimeHours = roundCurrency(summary.overtimeHours);
  summary.overtimeHours = roundCurrency(summary.overtimeHours);
  summary.regularHours = roundCurrency(summary.paidDays * 8);

  return summary;
}

function applyAttendanceOverride(summary: AttendanceSummary, override: PayrollOverrideRow | null) {
  if (!override) {
    return summary;
  }

  const paidDays = override.paid_days_override === null || override.paid_days_override === undefined
    ? summary.paidDays
    : Number(override.paid_days_override);
  const overtimeHours = override.overtime_hours_override === null || override.overtime_hours_override === undefined
    ? summary.overtimeHours
    : Number(override.overtime_hours_override);

  return {
    ...summary,
    paidDays: Number.isFinite(paidDays) ? paidDays : summary.paidDays,
    overtimeHours: Number.isFinite(overtimeHours) ? roundCurrency(overtimeHours) : summary.overtimeHours,
    regularHours: roundCurrency((Number.isFinite(paidDays) ? paidDays : summary.paidDays) * 8),
    overrideApplied: true,
  };
}

function buildAttendanceRemarks(summary: unknown) {
  if (!summary || typeof summary !== 'object') return null;
  const attendance = summary as Partial<AttendanceSummary>;
  return `Attendance ${attendance.startDate || ''} to ${attendance.endDate || ''}: ${attendance.presentDays || 0} present, ${attendance.remoteDays || 0} remote, ${attendance.leaveDays || 0} leave, ${attendance.lateDays || 0} late, ${attendance.absentDays || 0} absent, ${attendance.regularHours || 0} regular hours.`;
}

function buildPayrollNotes(
  payBasis: string,
  payFrequency: string,
  payoutDay: string,
  firstCutoffDay: string,
  secondCutoffDay: string,
  attendanceSummary: unknown,
) {
  const schedule = payFrequency === 'monthly'
    ? `monthly on day ${payoutDay}`
    : `semi-monthly on days ${firstCutoffDay} and ${secondCutoffDay}`;
  const attendanceRemarks = buildAttendanceRemarks(attendanceSummary);
  return [`Pay basis: ${payBasis}. Release schedule: ${schedule}.`, attendanceRemarks]
    .filter(Boolean)
    .join(' ');
}

export default router;
