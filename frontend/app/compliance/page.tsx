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
        <p className="eyebrow">Compliance command</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Stay audit-ready every day</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Live compliance requirements pulled from your Supabase database.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm font-bold text-slate-500">Total requirements</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{rows.length}</p>
        </div>
      </section>

      <section className="section-card">
        <p className="eyebrow">Risk overview</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Compliance checklist</h3>

        {loading && <p className="mt-6 text-slate-600">Loading compliance requirements...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error}</p>}
        {!loading && rows.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No compliance requirements found in Supabase yet.</p>
        )}

        <p className="mt-4 text-sm text-slate-500">Click any compliance item or its button to open the full record.</p>

        <div className="mt-6 space-y-3">
          {rows.map((row, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveRow(row)}
              className={`flex w-full items-center justify-between rounded-2xl p-4 text-left transition hover:bg-slate-100 ${activeRow === row ? "bg-blue-50 ring-1 ring-blue-200" : "bg-slate-50"}`}
            >
              <div>
                <p className="font-bold text-slate-700">
                  {pick(row, ["title"])}
                </p>
                <p className="text-sm text-slate-500">
                  {pick(row, ["category", "description"])}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
                  {pick(row, ["frequency"])}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-sm">
                  View details
                </span>
              </div>
            </button>
          ))}
        </div>
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
