export interface PayrollComponents {
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  bonus: number;
  allowances: number;
  taxRate: number;
  /**
   * Kept for backwards compatibility with older frontend payloads.
   * The backend now computes statutory deductions internally and does not
   * trust this value for final payroll results.
   */
  insuranceDeduction?: number;
  loanDeduction: number;
}

export interface ContributionShare {
  employee: number;
  employer: number;
  total: number;
}

export interface GovernmentContributions {
  sss: ContributionShare;
  philHealth: ContributionShare;
  pagIbig: ContributionShare;
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
}

export interface PayrollResult {
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  taxAmount: number;
  employerCost: number;
  governmentContributions: GovernmentContributions;
}

function roundCurrency(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeGovernmentContributions(monthlyCompensation: number): GovernmentContributions {
  const compensation = Math.max(0, Number(monthlyCompensation) || 0);

  /*
    SSS formula used for now:
    - Monthly Salary Credit (MSC) uses gross monthly compensation.
    - Minimum MSC is ₱5,000.
    - Maximum MSC is capped at ₱35,000.
    - Employee share = MSC × 5%.
    - Employer share = MSC × 10%.
    - Total = MSC × 15%.
  */
  const sssMsc = clamp(compensation, 5000, 35000);
  const sssEmployee = roundCurrency(sssMsc * 0.05);
  const sssEmployer = roundCurrency(sssMsc * 0.10);

  /*
    PhilHealth formula:
    - Salary base is capped between ₱10,000 and ₱100,000.
    - Total premium = salary base × 5%.
    - Employee and employer split the premium equally.
  */
  const philHealthBase = clamp(compensation, 10000, 100000);
  const philHealthTotal = roundCurrency(philHealthBase * 0.05);
  const philHealthEmployee = roundCurrency(philHealthTotal / 2);
  const philHealthEmployer = roundCurrency(philHealthTotal / 2);

  /*
    Pag-IBIG formula:
    - Salary base is capped at ₱10,000.
    - If monthly compensation is <= ₱1,500, employee rate is 1%.
    - If monthly compensation is > ₱1,500, employee rate is 2%.
    - Employer rate is 2%.
    - Employee and employer contributions are each capped at ₱200.
  */
  const pagIbigBase = Math.min(compensation, 10000);
  const pagIbigEmployeeRate = compensation <= 1500 ? 0.01 : 0.02;
  const pagIbigEmployee = roundCurrency(Math.min(pagIbigBase * pagIbigEmployeeRate, 200));
  const pagIbigEmployer = roundCurrency(Math.min(pagIbigBase * 0.02, 200));

  const sss = {
    employee: sssEmployee,
    employer: sssEmployer,
    total: roundCurrency(sssEmployee + sssEmployer),
  };

  const philHealth = {
    employee: philHealthEmployee,
    employer: philHealthEmployer,
    total: roundCurrency(philHealthEmployee + philHealthEmployer),
  };

  const pagIbig = {
    employee: pagIbigEmployee,
    employer: pagIbigEmployer,
    total: roundCurrency(pagIbigEmployee + pagIbigEmployer),
  };

  const totalEmployeeDeduction = roundCurrency(
    sss.employee + philHealth.employee + pagIbig.employee,
  );
  const totalEmployerContribution = roundCurrency(
    sss.employer + philHealth.employer + pagIbig.employer,
  );

  return {
    sss,
    philHealth,
    pagIbig,
    totalEmployeeDeduction,
    totalEmployerContribution,
  };
}

export function calculatePayroll(components: PayrollComponents): PayrollResult {
  const overtimePay = components.overtimeHours * components.overtimeRate;
  const grossEarnings = roundCurrency(
    components.basicSalary + overtimePay + components.bonus + components.allowances,
  );
  const taxAmount = roundCurrency(grossEarnings * components.taxRate);
  const governmentContributions = computeGovernmentContributions(grossEarnings);
  const totalDeductions = roundCurrency(
    taxAmount + governmentContributions.totalEmployeeDeduction + components.loanDeduction,
  );
  const netPay = roundCurrency(Math.max(0, grossEarnings - totalDeductions));
  const employerCost = roundCurrency(
    grossEarnings + governmentContributions.totalEmployerContribution,
  );

  return {
    grossEarnings,
    totalDeductions,
    netPay,
    taxAmount,
    employerCost,
    governmentContributions,
  };
}
