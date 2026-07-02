"use client";

import { useCallback, useEffect, useState } from "react";
import RecordDetailsModal from "../components/record-details-modal";
import { useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

const API_BASE = "/api";

type Row = Record<string, unknown>;

function pick(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "—";
}

export default function CompliancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/data/compliance`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error("Failed to load compliance requirements");
      const data = await res.json();
      setRows(data.compliance || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function handleClose() {
      setActiveRow(null);
    }

    window.addEventListener("record-details-modal-close", handleClose);
    return () => window.removeEventListener("record-details-modal-close", handleClose);
  }, []);

  useSupabaseTableRefresh([{ table: "compliance_records" }], () => {
    void load();
  });

  const today = new Date().toISOString().split("T")[0];
  const overdueCount = rows.filter((r) => {
    const status = String(r.status ?? "").toLowerCase();
    const dueDate = String(r.due_date ?? "");
    const isCompleted = ["completed", "compliant"].includes(status);
    return !isCompleted && (status === "overdue" || (dueDate !== "" && dueDate < today));
  }).length;
  const pendingCount = rows.filter((r) => {
    const status = String(r.status ?? "").toLowerCase();
    return status === "pending" || status === "upcoming";
  }).length;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Risk &amp; Compliance</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Compliance</h1>
          <p className="mt-1 text-sm text-slate-500">Live compliance requirements with real-time monitoring.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[0.875rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">Total requirements</p>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{rows.length}</p>
          <p className="mt-1 text-xs text-slate-400">Active compliance items</p>
        </div>

        <div className="rounded-[0.875rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">Overdue / At-risk</p>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{overdueCount}</p>
          <p className="mt-1 text-xs text-slate-400">Items overdue or past due date</p>
        </div>

        <div className="rounded-[0.875rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-500">Pending / Upcoming</p>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{pendingCount}</p>
          <p className="mt-1 text-xs text-slate-400">Items pending or upcoming</p>
        </div>
      </section>

      <section className="section-card">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-2.5 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-green-600">Risk Overview</p>
            <h3 className="text-2xl font-black text-slate-950">Compliance checklist</h3>
          </div>
        </div>

        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 p-6">
            <svg className="h-5 w-5 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold text-green-700">Loading compliance requirements...</p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="font-bold text-red-900">Error loading data</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <p className="mt-4 text-sm font-semibold text-slate-500">No compliance requirements found in Supabase yet.</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-sm font-semibold text-green-700">
                Click any compliance item to view full details and documentation
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {rows.map((row, index) => {
                const isActive = activeRow === row;
                return (
                  <button
                    key={String(row.id ?? index)}
                    type="button"
                    onClick={() => setActiveRow(row)}
                    className={`flex w-full items-center justify-between rounded-[0.875rem] border bg-white px-4 py-3.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 text-left ${
                      isActive ? "border-blue-300" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-950">
                          {pick(row, ["title"])}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                          </svg>
                          {pick(row, ["category", "description"])}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const statusVal = pick(row, ["status"]);
                        const s = statusVal.toLowerCase();
                        const rowDue = String(row.due_date ?? "");
                        const isCompleted = ["completed", "compliant"].includes(s);
                        const isOverdue = !isCompleted && (s === "overdue" || (rowDue !== "" && rowDue < today));
                        const isPending = s === "pending" || s === "upcoming";
                        const badgeClass = isOverdue
                          ? "bg-red-100 text-red-700"
                          : isPending
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700";
                        return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                            {statusVal}
                          </span>
                        );
                      })()}
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {pick(row, ["frequency"])}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                        View details
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <RecordDetailsModal
        title={activeRow ? pick(activeRow, ["title"]) : "Compliance requirement"}
        subtitle={activeRow ? `${pick(activeRow, ["category"])} · ${pick(activeRow, ["frequency"])}` : undefined}
        row={activeRow}
        isOpen={Boolean(activeRow)}
      />
    </div>
  );
}
