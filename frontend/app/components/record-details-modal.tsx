"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RecordDetailsModalProps = {
  title: string;
  subtitle?: string;
  row: Record<string, unknown> | null;
  isOpen: boolean;
  currentUserId?: string;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatDateTime(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

const CLOSE_EVENT = "record-details-modal-close";

export default function RecordDetailsModal({ title, subtitle, row, isOpen, currentUserId }: RecordDetailsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.dispatchEvent(new Event(CLOSE_EVENT));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setShowMore(false);
  }, [isOpen]);

  const view = useMemo(() => {
    if (!row) return null;

    const overview = [
      { label: "Status", value: pickValue(row, ["status"]) },
      { label: "Employee", value: pickValue(row, ["employees", "employee_name", "employeeName", "full_name", "name"]) },
      { label: "Leave type", value: pickValue(row, ["leave_types", "leave_type_name", "leaveTypeName", "type", "leave_type"]) },
      { label: "Start date", value: pickValue(row, ["start_date", "startDate"]) },
      { label: "End date", value: pickValue(row, ["end_date", "endDate"]) },
      { label: "Total days", value: pickValue(row, ["total_days", "totalDays"]) },
      { label: "Reason", value: pickValue(row, ["reason"]) },
      { label: "Reviewed by", value: pickValue(row, ["reviewed_by", "reviewedBy", "approved_by", "approvedBy"]) },
    ];

    const seen = new Set([
      "status",
      "employee_name",
      "employeeName",
      "full_name",
      "name",
      "leave_type_name",
      "leaveTypeName",
      "type",
      "leave_type",
      "start_date",
      "startDate",
      "end_date",
      "endDate",
      "total_days",
      "totalDays",
      "reason",
      "approved_by",
      "approvedBy",
      "reviewed_by",
      "reviewedBy",
    ]);

    const entries = Object.entries(row).filter(([, value]) => typeof value !== "object" || value === null);
    const nestedEntries = Object.entries(row).filter(([, value]) => typeof value === "object" && value !== null);
    const details = entries.filter(([key]) => !seen.has(key));

    return { overview, details, nestedEntries };
  }, [row]);

  if (!isOpen || !row || !view) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4 backdrop-blur-sm sm:px-6"
      onClick={(e) => {
        if (e.target === overlayRef.current) window.dispatchEvent(new Event(CLOSE_EVENT));
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/10 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[1.5rem]">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(CLOSE_EVENT))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Overview</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {view.overview.map((item) => {
                  const value = formatValue(item.value);
                  const isStatus = item.label === "Status";
                  const statusText = value.toLowerCase();
                  const pillClass =
                    statusText === "approved"
                      ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                      : statusText === "rejected"
                      ? "bg-red-100 text-red-700 ring-1 ring-red-200"
                      : statusText === "cancelled"
                      ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      : statusText === "pending"
                      ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
                  return (
                    <div key={item.label} className="rounded-xl border border-white bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">{item.label}</span>
                      <div className="mt-1.5">
                        {isStatus ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${pillClass}`}>{value}</span>
                        ) : (
                          <span className="block text-[11px] font-semibold leading-5 text-slate-800 break-words sm:text-xs">{value}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {String(pickValue(row, ["status"])).toLowerCase() === "cancelled" ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                  This request was withdrawn by the requester.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">History</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Submitted by</span>
                  <div className="mt-1 flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm-12 11.25a8.25 8.25 0 0 1 16.5 0v.75H3.75v-.75Z" />
                    </svg>
                    <span className="block text-[11px] font-semibold text-slate-800 sm:text-xs">
                      {String(pickValue(row, ["requested_by", "created_by", "submitted_by"])) === String(currentUserId || "")
                        ? "You"
                        : formatValue(pickValue(row, ["requested_by", "created_by", "submitted_by"]))}
                    </span>
                    {String(pickValue(row, ["status"])).toLowerCase() === "cancelled" ? (
                      <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Requester {String(pickValue(row, ["requested_by", "created_by", "submitted_by"])) === String(currentUserId || "") ? "You" : "Other"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Reviewed by</span>
                  <div className="mt-1 flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="block text-[11px] font-semibold text-slate-800 sm:text-xs">{formatValue(pickValue(row, ["reviewed_by", "approved_by"]))}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Withdrawn</span>
                  <div className="mt-1 flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="block text-[11px] font-semibold text-slate-800 sm:text-xs">{String(pickValue(row, ["status"])).toLowerCase() === "cancelled" ? "Yes" : "No"}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5 shadow-sm shadow-slate-950/5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Withdraw note</span>
                  <div className="mt-1 flex items-start gap-2">
                    {String(pickValue(row, ["status"])).toLowerCase() === "cancelled" ? (
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    ) : null}
                    <span className="block text-[11px] font-semibold text-slate-800 sm:text-xs">
                      {String(pickValue(row, ["status"])).toLowerCase() === "cancelled"
                        ? String(pickValue(row, ["requested_by", "created_by", "submitted_by"])) === String(currentUserId || "")
                          ? "Withdrawn by you"
                          : "Withdrawn by requester"
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 shadow-sm shadow-slate-950/5 sm:col-span-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-500 sm:text-[10px]">Withdrawn at</span>
                  <div className="mt-1 flex items-start gap-2">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="block text-[11px] font-semibold text-amber-900 sm:text-xs">
                      {formatDateTime(pickValue(row, ["withdrawn_at", "cancelled_at", "withdrawal_date"]))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {view.nestedEntries.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => setShowMore((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">More details</p>
                  <span className="text-xs font-semibold text-slate-500">{showMore ? "Hide" : "Show"}</span>
                </button>

                {showMore && (
                  <div className="mt-3 space-y-3">
                    {view.details.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {view.details.map(([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-2 rounded-lg bg-white px-3 py-2">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{formatKey(key)}</span>
                            <span className="text-right text-[10px] text-slate-700 break-all sm:text-xs">{formatValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {view.nestedEntries.map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">{formatKey(key)}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(value as Record<string, unknown>).map(([subKey, subVal]) => (
                            <div key={subKey} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-2">
                              <span className="text-[9px] font-semibold text-slate-500 sm:text-[10px]">{formatKey(subKey)}</span>
                              <span className="text-right text-[9px] text-slate-700 break-all sm:text-[10px]">{formatValue(subVal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
