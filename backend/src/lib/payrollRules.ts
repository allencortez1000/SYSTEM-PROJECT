export const STANDARD_WORK_HOURS_PER_DAY = 8;
export const REGULAR_OVERTIME_MULTIPLIER = 1.25;
export const REST_DAY_MULTIPLIER = 1.3;
export const REST_DAY_OVERTIME_MULTIPLIER = 1.3;

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function computeRegularOvertimeRate(dailyRate: number) {
  return roundCurrency(((Number(dailyRate) || 0) / STANDARD_WORK_HOURS_PER_DAY) * REGULAR_OVERTIME_MULTIPLIER);
}

export function computeRestDayRate(dailyRate: number) {
  return roundCurrency((Number(dailyRate) || 0) * REST_DAY_MULTIPLIER);
}

export function computeRestDayHourlyRate(dailyRate: number) {
  return roundCurrency(computeRestDayRate(dailyRate) / STANDARD_WORK_HOURS_PER_DAY);
}

export function computeRestDayOvertimeRate(dailyRate: number) {
  return roundCurrency(computeRestDayHourlyRate(dailyRate) * REST_DAY_OVERTIME_MULTIPLIER);
}

export function computeOvertimePay(overtimeHours: number, overtimeRate: number) {
  return roundCurrency((Number(overtimeHours) || 0) * (Number(overtimeRate) || 0));
}
