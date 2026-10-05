"use client";

import { useEffect, useRef } from "react";

type LeaveDetailsModalProps = {
  row: Record<string, unknown> | null;
  isOpen: boolean;
  currentUserId?: string;
};

function extractLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(extractLabel).find((item) => item !== "—") || "—";
  const record = value as Record<string, unknown>;
  return (
    extractLabel(record.full_name ?? record.fullName ?? record.name ?? record.title ?? record.code ?? record.employee_name ?? record.employeeName ?? record.leave_type_name ?? record.leaveTypeName) ||
    "—"
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return extractLabel(value);
  return String(value);
}

function formatDateTime(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
  if (value === "rejected") return "bg-red-100 text-red-700 ring-1 ring-red-200";
  if (value === "cancelled") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
}

const CLOSE_EVENT = "record-details-modal-close";

export default function LeaveDetailsModal({ row, isOpen, currentUserId }: LeaveDetailsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.dispatchEvent(new Event(CLOSE_EVENT));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!isOpen || !row) return null;

  const status = String(pick(row, ["status"]) ?? "").toLowerCase();
  const employeeName = extractLabel(pick(row, ["employees", "employee_name", "employeeName", "full_name", "name"]));
  const leaveType = extractLabel(pick(row, ["leave_types", "leave_type_name", "leaveTypeName", "type", "leave_type"]));
  const submittedBy = extractLabel(pick(row, ["requested_by", "created_by", "submitted_by"]));
  const reviewedBy = extractLabel(pick(row, ["reviewed_by", "approved_by"]));
  const requester = pick(row, ["requested_by", "created_by", "submitted_by"]);
  const isRequesterMe = String(requester ?? "") === String(currentUserId || "");
  const withdrawnAt = pick(row, ["withdrawn_at", "cancelled_at", "withdrawal_date"]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-x-0 top-16 bottom-0 z-50 grid place-items-center bg-black/50 px-4 backdrop-blur-sm sm:top-20 sm:px-6 lg:top-24"
      onClick={(e) => {
        if (e.target === overlayRef.current) window.dispatchEvent(new Event(CLOSE_EVENT));
      }}
    >
      <div className="flex max-h-[calc(100dvh-5rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-[1rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/10 sm:max-h-[calc(100dvh-6rem)] sm:rounded-[1.2rem]">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-3.5 sm:py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">{employeeName}</h2>
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
              {leaveType} · {String(status.charAt(0).toUpperCase() + status.slice(1) || "—")}
              {status === "cancelled" && withdrawnAt ? ` · Withdrawn at ${formatDateTime(withdrawnAt)}` : status === "cancelled" ? " · Withdrawn" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CLOSE_EVENT))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2 sm:px-3 sm:py-2.5">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 sm:p-2.5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Overview</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white bg-white px-2 py-1.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Status</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusTone(status)}`}>
                      {String(status.charAt(0).toUpperCase() + status.slice(1) || "—")}
                    </span>
                    {status === "cancelled" ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Withdrawn</span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Total days</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{formatValue(pick(row, ["total_days", "totalDays"]))}</span>
                </div>

                <div className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Start date</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{formatValue(pick(row, ["start_date", "startDate"]))}</span>
                </div>

                <div className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">End date</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{formatValue(pick(row, ["end_date", "endDate"]))}</span>
                </div>

                <div className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5 sm:col-span-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Reason</span>
                  <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-800 sm:text-xs">{formatValue(pick(row, ["reason"]))}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Audit</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Submitted by</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{isRequesterMe ? "You" : submittedBy}</span>
                  {status === "cancelled" ? (
                    <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      Requester {isRequesterMe ? "You" : "Other"}
                    </span>
                  ) : null}
                </div>

                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Reviewed by</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{reviewedBy}</span>
                </div>

                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Withdrawn</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-800 sm:text-xs">{status === "cancelled" ? "Yes" : "No"}</span>
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 shadow-sm shadow-slate-950/5 sm:col-span-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-500 sm:text-[10px]">Withdrawn at</span>
                  <span className="mt-1 block text-[11px] font-semibold text-amber-900 sm:text-xs">{formatDateTime(withdrawnAt)}</span>
                </div>
              </div>

              {status === "cancelled" ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                  This request was withdrawn by the requester.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 py-2.5 sm:px-4 sm:py-2.5">
          <button type="button" onClick={() => window.dispatchEvent(new Event(CLOSE_EVENT))} className="primary-button w-full py-2.5 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
