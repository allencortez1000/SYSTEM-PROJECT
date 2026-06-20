"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

type AttendanceInsightsResponse = {
  metrics?: {
    totalRecords?: number;
    presentRate?: number;
    absences?: number;
    remoteWork?: number;
    leaveRecords?: number;
  };
  teams?: Array<{
    team: string;
    presentRate: number;
    absent: number;
    remote: number;
    leave: number;
  }>;
  error?: string | null;
};

export default function AttendanceInsightsReportPage() {
  const [data, setData] = useState<AttendanceInsightsResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/data/reports/attendance-insights`, { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to load attendance report from Supabase");
        setData(payload);
        if (payload?.error) setError(payload.error);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const metrics = useMemo(() => {
    const values = data.metrics || {};
    return [
      { label: "Present rate", value: `${values.presentRate || 0}%`, detail: `${values.totalRecords || 0} attendance records` },
      { label: "Absences", value: String(values.absences || 0), detail: "Recorded absences" },
      { label: "Remote work", value: String(values.remoteWork || 0), detail: "Remote attendance entries" },
      { label: "Leave records", value: String(values.leaveRecords || 0), detail: "Attendance marked as leave" },
    ];
  }, [data.metrics]);

  const attendanceRows = data.teams || [];

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Attendance report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Attendance insights
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Review presence, absence, remote work, and leave patterns from Supabase attendance records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/attendance" className="primary-button">
              Open attendance
            </Link>
            <Link href="/reports" className="secondary-button">
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      {loading && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading attendance insights from Supabase...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{metric.label}</p>
            <p className="mt-3 break-words text-2xl font-black text-slate-950 sm:text-3xl">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Team breakdown</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Attendance by team</h3>
        </div>

        {!loading && attendanceRows.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No attendance records found in Supabase yet.</p>
        )}

        {attendanceRows.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Present rate</th>
                  <th>Absences</th>
                  <th>Remote</th>
                  <th>Leave</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {attendanceRows.map((row) => (
                  <tr key={row.team} className="hover:bg-slate-50">
                    <td className="font-black text-slate-950">{row.team}</td>
                    <td className="font-bold text-emerald-700">{row.presentRate}%</td>
                    <td className="text-slate-600">{row.absent}</td>
                    <td className="text-slate-600">{row.remote}</td>
                    <td className="font-bold text-slate-700">{row.leave}</td>
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
