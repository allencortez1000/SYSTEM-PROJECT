"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";

type LeaveRow = Record<string, unknown>;

function pick(row: LeaveRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "—";
}

function nested(row: LeaveRow, parent: string, child: string): string {
  const obj = row[parent] as Record<string, unknown> | null | undefined;
  if (obj && obj[child] !== undefined && obj[child] !== null && obj[child] !== "") {
    return String(obj[child]);
  }
  return "—";
}

export default function LeavePage() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/data/leave`);
        if (!res.ok) throw new Error("Failed to load leave requests");
        const data = await res.json();
        setRows(data.leave || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const summary = useMemo(() => {
    const pending = rows.filter((r) => pick(r, ["status"]).toLowerCase() === "pending").length;
    const approved = rows.filter((r) => pick(r, ["status"]).toLowerCase() === "approved").length;
    return [
      ["Total requests", String(rows.length), "Stored in Supabase"],
      ["Pending", String(pending), "Awaiting manager review"],
      ["Approved", String(approved), "Confirmed time off"],
    ] as const;
  }, [rows]);

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Leave management</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Balance time off and coverage</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Live leave requests pulled from your Supabase database.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summary.map(([label, value, detail]) => (
          <div key={label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p>
          </div>
        ))}
      </section>

      <section className="section-card">
        <p className="eyebrow">Requests</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Leave requests</h3>

        {loading && <p className="mt-6 text-slate-600">Loading leave requests...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error}</p>}

        {!loading && rows.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No leave requests found in Supabase yet.</p>
        )}

        {rows.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="font-bold text-slate-950">{nested(row, "employees", "full_name")}</td>
                    <td className="text-slate-700">{nested(row, "leave_types", "name")}</td>
                    <td className="text-slate-600">{pick(row, ["start_date"])}</td>
                    <td className="text-slate-600">{pick(row, ["end_date"])}</td>
                    <td className="text-slate-600">{pick(row, ["total_days"])}</td>
                    <td>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {pick(row, ["status"])}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
