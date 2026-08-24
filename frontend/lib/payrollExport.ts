export function sanitizeExportFileName(value: string) {
  return String(value || "").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
}

export function buildPayrollExportName(payFrequency: string) {
  return `${String(payFrequency || "payroll").toLowerCase().replace(/\s+/g, "-")}-pr-payroll`;
}

export function buildOfficeExportName(payPeriod: string) {
  return `office-payroll-${String(payPeriod).toLowerCase().replace(/\s+/g, "-")}-office`;
}

export function buildOfficePayslipName(payPeriod: string) {
  return `office-payslip-${String(payPeriod).toLowerCase().replace(/\s+/g, "-")}`;
}
