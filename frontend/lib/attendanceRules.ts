export type AttendanceStatusValue = string | null | undefined;

export function normalizeAttendanceStatus(value: AttendanceStatusValue) {
  return String(value || "").trim().toLowerCase();
}

export function isAbsentAttendanceStatus(value: AttendanceStatusValue) {
  const status = normalizeAttendanceStatus(value);
  return status === "absent" || status === "canceled work";
}

export function isLeaveAttendanceStatus(value: AttendanceStatusValue) {
  return normalizeAttendanceStatus(value) === "leave";
}

export function getFallbackAttendanceDays(record: { status?: AttendanceStatusValue; workedHours?: number | string | null; worked_hours?: number | string | null }) {
  const status = normalizeAttendanceStatus(record.status);
  if (status === "absent" || status === "canceled work") return 0;
  if (status === "leave") return 8;
  const workedHours = Number(record.workedHours ?? record.worked_hours ?? 0) || 0;
  if (workedHours > 0) return Math.min(workedHours, 8) / 8;
  if (status === "present" || status === "remote" || status === "late") return 1;
  return 0;
}

export function getFallbackAttendanceOvertime(record: { status?: AttendanceStatusValue; workedHours?: number | string | null; worked_hours?: number | string | null; overtimeHours?: number | string | null; overtime_hours?: number | string | null }) {
  const status = normalizeAttendanceStatus(record.status);
  if (status === "absent" || status === "canceled work") return 0;
  const overtime = Number(record.overtimeHours ?? record.overtime_hours ?? 0) || 0;
  if (overtime > 0) return overtime;
  const workedHours = Number(record.workedHours ?? record.worked_hours ?? 0) || 0;
  return workedHours > 8 ? workedHours - 8 : 0;
}

export function parseTimeToMinutes(value: string) {
  const trimmed = String(value || "").trim();
  const meridiem = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)$/i);
  if (meridiem) {
    let hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2]);
    const ampm = meridiem[3].toLowerCase();
    if (hours === 12) hours = 0;
    if (ampm === "pm") hours += 12;
    return hours * 60 + minutes;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function computeGrossHours(checkIn: string, checkOut: string) {
  const s = parseTimeToMinutes(checkIn);
  const e = parseTimeToMinutes(checkOut);
  if (s === null || e === null || e <= s) return 0;
  return (e - s) / 60;
}

export function getAttendanceWorkRules(department?: string | null, projectSite?: string | null) {
  const dept = String(department || "").trim().toLowerCase();
  const site = String(projectSite || "").trim().toLowerCase();
  const usesLunchDeduction = dept === "construction" || (dept === "rbac" && site === "main office");
  const overtimeThreshold = dept === "construction" ? 9 : 8;
  return { usesLunchDeduction, overtimeThreshold };
}

export function computeWorkedHours(checkIn: string, checkOut: string, department?: string | null, projectSite?: string | null) {
  const gross = computeGrossHours(checkIn, checkOut);
  if (gross <= 0) return 0;
  const { usesLunchDeduction } = getAttendanceWorkRules(department, projectSite);
  return Math.floor(Math.max(0, usesLunchDeduction && gross >= 8 ? gross - 1 : gross));
}

export function computeAutoOvertime(checkIn: string, checkOut: string, department?: string | null) {
  const grossHours = computeGrossHours(checkIn, checkOut);
  if (grossHours <= 0) return 0;
  const { overtimeThreshold } = getAttendanceWorkRules(department, undefined);
  const overtimeHours = grossHours - overtimeThreshold;
  return Math.max(0, Math.round(overtimeHours * 100) / 100);
}
