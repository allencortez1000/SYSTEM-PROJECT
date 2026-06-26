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
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/data/compliance`);
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

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1.5">
          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <span className="text-sm font-bold text-green-700">Compliance Command</span>
        </div>
        <h2 className="mt-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-5xl font-black tracking-tight text-transparent">
          Stay audit-ready every day
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Live compliance requirements pulled from your Supabase database with real-time monitoring.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute right-4 top-4 opacity-20 transition-opacity duration-300 group-hover:opacity-30">
            <div className="rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-3 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-600">Total requirements</p>
          <p className="mt-3 bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-4xl font-black text-transparent">
            {rows.length}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Active compliance items</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute right-4 top-4 opacity-20 transition-opacity duration-300 group-hover:opacity-30">
            <div className="rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 p-3 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-600">Audit status</p>
          <p className="mt-3 bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-4xl font-black text-transparent">
            Ready
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">All systems monitored</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute right-4 top-4 opacity-20 transition-opacity duration-300 group-hover:opacity-30">
            <div className="rounded-full bg-gradient-to-br from-slate-700 to-slate-900 p-3 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-600">Real-time sync</p>
          <p className="mt-3 bg-gradient-to-br from-slate-700 to-slate-900 bg-clip-text text-4xl font-black text-transparent">
            Live
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Instant updates enabled</p>
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
                    key={index}
                    type="button"
                    onClick={() => setActiveRow(row)}
                    className={`group flex w-full items-center justify-between rounded-2xl border-2 p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                      isActive
                        ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-green-200"
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-110 ${
                        isActive
                          ? "from-green-500 to-emerald-500"
                          : "from-slate-500 to-slate-600"
                      }`}>
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1.5 text-xs font-black text-blue-800 shadow-sm">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {pick(row, ["frequency"])}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-slate-950 to-slate-800 px-4 py-2 text-xs font-black text-white shadow-md transition-all group-hover:from-green-600 group-hover:to-emerald-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
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
