export const STANDARD_WORK_HOURS_PER_DAY = 8;
export const MONTHLY_WORKING_DAYS = 26;
export const REGULAR_OVERTIME_MULTIPLIER = 1.25;
export const REST_DAY_MULTIPLIER = 1.3;
export const REST_DAY_OVERTIME_MULTIPLIER = 1.3;

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type WorkerPayrollInput = {
  dailyRate: number;
  days: number;
  restDayDays?: number;
  overtimeHours: number;
  restDayOvertimeHours?: number;
  holidayPay?: number;
  sss?: number;
  pagIbig?: number;
  philHealth?: number;
  sssLoan?: number;
  tax?: number;
  additionalDeduction?: number;
  cashAdvance?: number;
};

export type WorkerPayrollBreakdown = {
  amount: number;
  otPay: number;
  holidayPay: number;
  totalSalary: number;
  sss: number;
  pagIbig: number;
  philHealth: number;
  sssLoan: number;
  tax: number;
  additionalDeduction: number;
  totalDeduction: number;
  netSalary: number;
  normalDays: number;
  restDayDays: number;
  restDayRate: number;
  normalAmount: number;
  restDayAmount: number;
  normalOtHours: number;
  restDayOtHours: number;
  normalOtRate: number;
  normalOtPay: number;
  restDayHourlyRate: number;
  restDayOtRate: number;
  restDayOtPay: number;
};

export function computeWorkerPayroll(input: WorkerPayrollInput): WorkerPayrollBreakdown {
  const dailyRate = Number(input.dailyRate) || 0;
  const days = Math.max(0, Number(input.days) || 0);
  const overtimeHours = Math.max(0, Number(input.overtimeHours) || 0);
  const restDayDays = clamp(Number(input.restDayDays) || 0, 0, days);
  const restDayOtHours = clamp(Number(input.restDayOvertimeHours) || 0, 0, overtimeHours);
  const holidayPay = Number(input.holidayPay) || 0;
  const sss = Number(input.sss) || 0;
  const pagIbig = Number(input.pagIbig) || 0;
  const philHealth = Number(input.philHealth) || 0;
  const sssLoan = Number(input.sssLoan) || 0;
  const tax = Number(input.tax) || 0;
  const additionalDeduction = Number(input.additionalDeduction) || 0;
  const cashAdvance = Number(input.cashAdvance) || 0;

  const normalDays = Math.max(0, days - restDayDays);
  const restDayRate = roundCurrency(dailyRate * REST_DAY_MULTIPLIER);
  const normalAmount = roundCurrency(dailyRate * normalDays);
  const restDayAmount = roundCurrency(restDayRate * restDayDays);
  const amount = roundCurrency(normalAmount + restDayAmount);

  const normalOtHours = Math.max(0, overtimeHours - restDayOtHours);
  const normalOtRate = roundCurrency((dailyRate / STANDARD_WORK_HOURS_PER_DAY) * REGULAR_OVERTIME_MULTIPLIER);
  const normalOtPay = roundCurrency(normalOtRate * normalOtHours);
  const restDayHourlyRate = roundCurrency(restDayRate / STANDARD_WORK_HOURS_PER_DAY);
  const restDayOtRate = roundCurrency(restDayHourlyRate * REST_DAY_OVERTIME_MULTIPLIER);
  const restDayOtPay = roundCurrency(restDayOtRate * restDayOtHours);
  const otPay = roundCurrency(normalOtPay + restDayOtPay);

  const totalSalary = roundCurrency(amount + otPay + holidayPay);
  const totalDeduction = roundCurrency(cashAdvance + tax + sssLoan + additionalDeduction + philHealth + pagIbig + sss);
  const netSalary = roundCurrency(Math.max(0, totalSalary - totalDeduction));

  return {
    amount,
    otPay,
    holidayPay,
    totalSalary,
    sss,
    pagIbig,
    philHealth,
    sssLoan,
    tax,
    additionalDeduction,
    totalDeduction,
    netSalary,
    normalDays: roundCurrency(normalDays),
    restDayDays: roundCurrency(restDayDays),
    restDayRate,
    normalAmount,
    restDayAmount,
    normalOtHours: roundCurrency(normalOtHours),
    restDayOtHours: roundCurrency(restDayOtHours),
    normalOtRate,
    normalOtPay,
    restDayHourlyRate,
    restDayOtRate,
    restDayOtPay,
  };
}

export type OfficePayrollInput = {
  monthlySalary: number;
  days: number;
  holidayDays?: number;
  silDays?: number;
  lateMinutes?: number;
  overtimeHours: number;
  bonus?: number;
  allowances?: number;
  sss?: number;
  pagIbig?: number;
  philHealth?: number;
  tax?: number;
  sssLoan?: number;
  pagIbigLoan?: number;
  amicaCredits?: number;
  additionalDeduction?: number;
  cashAdvance?: number;
  cashAdvanceDeduction?: number;
};

export function computeOfficePayroll(input: OfficePayrollInput) {
  const monthlySalary = Number(input.monthlySalary) || 0;
  const days = Number(input.days) || 0;
  const holidayDays = Number(input.holidayDays) || 0;
  const silDays = Number(input.silDays) || 0;
  const lateMinutes = Number(input.lateMinutes) || 0;
  const overtimeHours = Number(input.overtimeHours) || 0;
  const bonus = Number(input.bonus) || 0;
  const allowances = Number(input.allowances) || 0;
  const sss = Number(input.sss) || 0;
  const pagIbig = Number(input.pagIbig) || 0;
  const philHealth = Number(input.philHealth) || 0;
  const tax = Number(input.tax) || 0;
  const sssLoan = Number(input.sssLoan) || 0;
  const pagIbigLoan = Number(input.pagIbigLoan) || 0;
  const amicaCredits = Number(input.amicaCredits) || 0;
  const additionalDeduction = Number(input.additionalDeduction) || 0;
  const cashAdvance = Number(input.cashAdvance) || 0;
  const cashAdvanceDeduction = Number(input.cashAdvanceDeduction) || 0;

  const dailyRate = roundCurrency(monthlySalary / MONTHLY_WORKING_DAYS);
  const lateDays = lateMinutes / 480;
  const effectiveDays = Math.max(0, days + holidayDays + silDays - lateDays);
  const proratedAmount = roundCurrency(dailyRate * effectiveDays);
  const overtimeRate = roundCurrency((dailyRate / STANDARD_WORK_HOURS_PER_DAY) * REGULAR_OVERTIME_MULTIPLIER);
  const otPay = roundCurrency(overtimeRate * overtimeHours);
  const gross = roundCurrency(proratedAmount + otPay + bonus + allowances);
  const cashBalance = roundCurrency(Math.max(0, cashAdvance - cashAdvanceDeduction));
  const totalDeduction = roundCurrency(
    sss + pagIbig + philHealth + tax + sssLoan + pagIbigLoan + amicaCredits + additionalDeduction + cashAdvanceDeduction,
  );
  const netSalary = roundCurrency(gross - totalDeduction);

  return {
    dailyRate,
    effectiveDays: roundCurrency(effectiveDays),
    proratedAmount,
    overtimeRate,
    otPay,
    gross,
    sss,
    pagIbig,
    philHealth,
    cashAdvance,
    cashAdvanceDeduction,
    cashBalance,
    totalDeduction,
    netSalary,
  };
}
