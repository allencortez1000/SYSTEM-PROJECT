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
  employeeName: string;
  startDate: string;
  endDate: string;
  presentDays: number;
  remoteDays: number;
  leaveDays: number;
  absentDays: number;
  lateDays: number;
  paidDays: number;
  regularHours: number;
  overtimeHours: number;
  totalRecords: number;
};

type AttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string | null;
  check_in?: string | null;
  check_out?: string | null;
};

router.get('/attendance-summary', async (req, res) => {
  try {
    const employeeName = String(req.query.employeeName || '').trim();
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();

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
    const { data: records, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('id, attendance_date, status, check_in, check_out')
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (attendanceError) throw attendanceError;

    const summary = summarizeAttendance(
      (records || []) as AttendanceRecord[],
      employee.full_name || employeeName,
      startDate,
      endDate,
    );

    res.json({ summary });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load attendance summary from Supabase',
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
): AttendanceSummary {
  const summary: AttendanceSummary = {
    employeeName,
    startDate,
    endDate,
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
  }

  // Payroll rule for now: present, remote, leave, and late days are paid days.
  // Absent days are tracked but not counted as paid days.
  summary.paidDays = summary.presentDays + summary.remoteDays + summary.leaveDays + summary.lateDays;
  summary.regularHours = summary.paidDays * 8;

  return summary;
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

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export default router;
