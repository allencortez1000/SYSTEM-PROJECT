export function normalizePayrollRunType(value: unknown) {
  const runType = String(value || "").trim().toUpperCase();
  if (runType) return runType;
  return "";
}

export function inferPayrollRunType(runCode: unknown, explicitRunType?: unknown) {
  const code = String(runCode || "").trim().toUpperCase();
  if (code.startsWith("PR")) return "PR";
  if (code.startsWith("OFFICE")) return "OFFICE";

  const normalized = normalizePayrollRunType(explicitRunType);
  if (normalized) return normalized;

  return "";
}

export function getPayrollRunTypeLabel(runCode: unknown, explicitRunType?: unknown) {
  return inferPayrollRunType(runCode, explicitRunType) || "OFFICE";
}
