"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseTableRefresh } from "../../../lib/supabaseRealtime";

const API_BASE = "/api";

type CompliancePacketResponse = {
  metrics?: {
    laborFilings?: string;
    policyAcknowledgements?: string;
    payrollEvidence?: string;
    openRisks?: number;
  };
  checklist?: Array<{
    item: string;
    owner: string;
    status: string;
  }>;
  error?: string | null;
};

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (["complete", "ready", "updated"].some((value) => normalized.includes(value))) return "bg-emerald-50 text-emerald-700";
  if (["review", "progress"].some((value) => normalized.includes(value))) return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

export default function CompliancePacketReportPage() {
  const [data, setData] = useState<CompliancePacketResponse>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/data/reports/compliance-packet`, { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to load compliance packet from Supabase");
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

  useSupabaseTableRefresh([
    { table: "employees" },
    { table: "attendance_records" },
    { table: "payroll_runs" },
    { table: "compliance_requirements" },
  ], () => {
    void fetch(`${API_BASE}/data/reports/compliance-packet`, { cache: "no-store" }).then(async (res) => {
      const payload = await res.json();
      if (res.ok) setData(payload);
    });
  });

  const metrics = useMemo(() => {
    const values = data.metrics || {};
    return [
      { label: "Labor filings", value: values.laborFilings || "Pending", detail: "From compliance requirements" },
      { label: "Policy acknowledgements", value: values.policyAcknowledgements || "0 active", detail: "Active Supabase requirements" },
      { label: "Payroll evidence", value: values.payrollEvidence || "Missing", detail: "Based on saved payroll runs" },
      { label: "Open risks", value: String(values.openRisks || 0), detail: "Active compliance items" },
    ];
  }, [data.metrics]);

  const checklist = data.checklist || [];

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Compliance report</p>
            <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Compliance packet
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Audit-ready labor reports, statutory contribution summaries, and payroll evidence from Supabase.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/compliance" className="primary-button">
              Open compliance
            </Link>
            <Link href="/reports" className="secondary-button">
              Back to reports
            </Link>
          </div>
        </div>
      </section>

      {loading && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">Loading compliance packet from Supabase...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{metric.label}</p>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-black ${statusTone(metric.value)}`}>
              {metric.value}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="section-card">
        <div>
          <p className="eyebrow">Audit checklist</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Compliance packet contents</h3>
        </div>

        {!loading && checklist.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No compliance requirements found in Supabase yet.</p>
        )}

        {checklist.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {checklist.map((row) => (
                  <tr key={`${row.owner}-${row.item}`} className="hover:bg-slate-50">
                    <td className="font-black text-slate-950">{row.item}</td>
                    <td className="text-slate-600">{row.owner}</td>
                    <td>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone(row.status)}`}>
                        {row.status}
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
