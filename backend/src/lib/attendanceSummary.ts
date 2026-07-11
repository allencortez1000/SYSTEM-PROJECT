export type AttendanceRecordLike = {
  attendance_date: string;
  status: string | null;
  check_in?: string | null;
  check_out?: string | null;
  worked_hours?: number | string | null;
  overtime_hours?: number | string | null;
};

export type AttendanceDaySummary = {
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

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function isSunday(dateValue?: string | null) {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isFinite(date.getTime()) && date.getDay() === 0;
}

function workedHoursFromRecord(record: AttendanceRecordLike) {
  if (record.worked_hours !== null && record.worked_hours !== undefined) {
    const worked = Number(record.worked_hours);
    return Number.isFinite(worked) ? worked : 0;
  }

  const parseTime = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)$/i);
    if (meridiemMatch) {
      let hours = Number(meridiemMatch[1]);
      const minutes = Number(meridiemMatch[2]);
      const meridiem = meridiemMatch[3].toLowerCase();
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
      if (hours === 12) hours = 0;
      if (meridiem === 'pm') hours += 12;
      return hours * 60 + minutes;
    }

    const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!twentyFourHourMatch) return null;
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const checkIn = parseTime(record.check_in);
  const checkOut = parseTime(record.check_out);
  if (checkIn === null || checkOut === null || checkOut <= checkIn) return 0;
  return roundCurrency((checkOut - checkIn) / 60);
}

function overtimeHoursFromRecord(record: AttendanceRecordLike) {
  if (record.overtime_hours !== null && record.overtime_hours !== undefined) {
    const overtime = Number(record.overtime_hours);
    return Number.isFinite(overtime) ? overtime : 0;
  }

  return Math.max(0, roundCurrency(workedHoursFromRecord(record) - 8));
}

export function summarizeAttendanceDays(records: AttendanceRecordLike[]) {
  const summary: AttendanceDaySummary = {
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
    const status = String(record.status || '').trim().toLowerCase();
    const workedHours = workedHoursFromRecord(record);
    const hasTimeEntry = workedHours > 0;

    if (isSunday(record.attendance_date)) {
      summary.overtimeHours += overtimeHoursFromRecord(record);
      continue;
    }

    const countsAsPaidWorkDay = status !== 'absent' || hasTimeEntry;

    if (countsAsPaidWorkDay) summary.presentDays += 1;
    if (status === 'remote') summary.remoteDays += 1;
    if (status === 'leave') summary.leaveDays += 1;
    if (status === 'absent') summary.absentDays += 1;
    if (status === 'late') summary.lateDays += 1;
    summary.overtimeHours += overtimeHoursFromRecord(record);

    if (status === 'leave') {
      summary.regularHours += 8;
    } else if (countsAsPaidWorkDay) {
      summary.regularHours += workedHours || 8;
    }
  }

  summary.paidDays = roundCurrency(summary.regularHours / 8);
  summary.regularHours = roundCurrency(summary.regularHours);
  summary.overtimeHours = roundCurrency(summary.overtimeHours);
  return summary;
}
