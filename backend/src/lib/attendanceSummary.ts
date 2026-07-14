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
  // Whole hours only — partial minutes within an hour are disregarded
  return Math.floor((checkOut - checkIn) / 60);
}

/** Raw gross hours from check_in/check_out (keeps minutes, used for OT). */
function grossHoursFromRecord(record: AttendanceRecordLike): number {
  if (record.worked_hours !== null && record.worked_hours !== undefined) {
    // If worked_hours is already stored, derive gross from it (OT built on top of it)
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

  // Use gross hours (not floored) so OT minutes are never lost
  return Math.max(0, roundCurrency(grossHoursFromRecord(record) - 8));
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

    // Status counters (whole-day buckets for reporting)
    if (countsAsPaidWorkDay) summary.presentDays += 1;
    if (status === 'remote') summary.remoteDays += 1;
    if (status === 'leave') summary.leaveDays += 1;
    if (status === 'absent') summary.absentDays += 1;
    if (status === 'late') summary.lateDays += 1;
    summary.overtimeHours += overtimeHoursFromRecord(record);

    // Regular hours — used to compute fractional paid days
    if (status === 'leave') {
      // Leave counts as a full 8-hour day
      summary.regularHours += 8;
    } else if (hasTimeEntry) {
      // Use actual worked hours (capped at 8 for the regular portion)
      summary.regularHours += Math.min(workedHours, 8);
    } else if (countsAsPaidWorkDay) {
      // Present/remote/late with no time entry → assume full 8-hour day
      summary.regularHours += 8;
    }
  }

  // paidDays = total regular hours / 8  (fractional, e.g. 6h = 0.75 days)
  summary.paidDays = roundCurrency(summary.regularHours / 8);
  summary.regularHours = roundCurrency(summary.regularHours);
  summary.overtimeHours = roundCurrency(summary.overtimeHours);
  return summary;
}
