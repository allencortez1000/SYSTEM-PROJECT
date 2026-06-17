export interface PayrollComponents {
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  bonus: number;
  allowances: number;
  taxRate: number;
  insuranceDeduction: number;
  loanDeduction: number;
}

export interface PayrollResult {
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxAmount: number;
  employerCost: number;
}

export function calculatePayroll(components: PayrollComponents): PayrollResult {
  const overtimePay = components.overtimeHours * components.overtimeRate;
  const grossEarnings =
    components.basicSalary + overtimePay + components.bonus + components.allowances;
  const taxAmount = Math.round(grossEarnings * components.taxRate);
  const totalDeductions =
    taxAmount + components.insuranceDeduction + components.loanDeduction;
  const netPay = Math.max(0, grossEarnings - totalDeductions);
  const employerCost = grossEarnings + components.insuranceDeduction;

  return {
    grossEarnings,
    totalDeductions,
    netPay,
    taxAmount,
    employerCost,
  };
}
