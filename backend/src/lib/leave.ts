export function calculateLeaveDays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Number.isFinite(diffMs) ? Math.max(1, Math.ceil(diffMs / 86400000) + 1) : 1;
}

export function isLeaveWithdrawable(status: unknown) {
  return String(status ?? '').trim().toLowerCase() === 'pending';
}

export function formatLeaveStatus(status: unknown) {
  const value = String(status ?? '').trim().toLowerCase();
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type LeaveRequestInput = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export function validateLeaveRequestInput(input: Partial<LeaveRequestInput>) {
  const employeeId = String(input.employeeId ?? '').trim();
  const leaveTypeId = String(input.leaveTypeId ?? '').trim();
  const startDate = String(input.startDate ?? '').trim();
  const endDate = String(input.endDate ?? '').trim();
  const reason = String(input.reason ?? '').trim();

  if (!employeeId || !leaveTypeId || !startDate || !endDate || !reason) {
    return 'employee_id, leave_type_id, start_date, end_date, and reason are required';
  }

  if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
    return 'End date cannot be earlier than start date';
  }

  return null;
}
