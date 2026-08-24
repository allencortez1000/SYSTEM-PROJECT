export type PayrollStatus = "Draft" | "Released" | "Paid" | "Reviewed" | string;

export function normalizePayrollStatus(value: unknown) {
  const status = String(value || "").trim();
  if (!status) return "Draft";
  const lower = status.toLowerCase();
  if (lower === "draft" || lower === "released" || lower === "paid" || lower === "reviewed") {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
  return status;
}

export function getPayrollStatusTone(status: unknown) {
  const normalized = normalizePayrollStatus(status).toLowerCase();
  if (normalized === "paid") return "bg-emerald-50 text-emerald-700";
  if (normalized === "released") return "bg-cyan-50 text-cyan-700";
  if (normalized === "reviewed") return "bg-violet-50 text-violet-700";
  return "bg-slate-50 text-slate-700";
}
