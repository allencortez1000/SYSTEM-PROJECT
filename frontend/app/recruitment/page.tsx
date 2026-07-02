"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [openings, setOpenings] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  useEffect(() => {
    function handleClose() {
      setActiveRow(null);
    }

    window.addEventListener("record-details-modal-close", handleClose);
    return () => window.removeEventListener("record-details-modal-close", handleClose);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [candRes, openRes] = await Promise.all([
        fetch(`${API_BASE}/data/candidates`, { headers }),
        fetch(`${API_BASE}/data/job-openings`, { headers }),
      ]);
      if (!candRes.ok) throw new Error("Failed to load candidates");
      const candData = await candRes.json();
      setCandidates(candData.candidates || []);
      if (!openRes.ok) {
        setError("Failed to load job openings");
      } else {
        const openData = await openRes.json();
        setOpenings(openData.jobOpenings || []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useSupabaseTableRefresh(
    [{ table: "candidates" }, { table: "job_openings" }],
    () => { void load(); },
  );

  const metrics = useMemo(
    () => [
      {
        label: "Open roles",
        value: String(openings.length),
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
          </svg>
        ),
        gradient: "from-blue-600 to-cyan-500",
        bgGradient: "from-blue-50 to-cyan-50",
      },
      {
        label: "Candidates",
        value: String(candidates.length),
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        ),
        gradient: "from-blue-500 to-cyan-500",
        bgGradient: "from-blue-50 to-cyan-50",
      },
    ],
    [openings, candidates],
  );

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Talent Acquisition</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Recruitment Pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">Live candidates and open roles with real-time tracking.</p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {metrics.map(({ label, value, icon }) => (
          <div
            key={label}
            className="rounded-[0.875rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {icon}
            </div>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
          </div>
        ))}
      </section>

      <section className="section-card">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-2.5 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Candidates</p>
            <h3 className="text-2xl font-black text-slate-950">Talent shortlist</h3>
          </div>
        </div>

        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold text-blue-700">Loading recruitment data...</p>
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

        {!loading && candidates.length === 0 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <p className="mt-4 text-sm font-semibold text-slate-500">No candidates found in Supabase yet.</p>
          </div>
        )}

        {candidates.length > 0 && (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-sm font-semibold text-blue-700">
                Click any candidate card to view full details and contact information
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {candidates.map((candidate, index) => {
                const isActive = activeRow === candidate;
                return (
                  <button
                    key={String(candidate.id ?? index)}
                    type="button"
                    onClick={() => setActiveRow(candidate)}
                    className={`w-full rounded-[0.875rem] border bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md hover:border-blue-200 text-left ${
                      isActive ? "border-blue-300" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </div>
                      {isActive && (
                        <div className="rounded-full bg-blue-500 p-1">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <p className="mt-4 text-lg font-black text-slate-950">
                      {pick(candidate, ["full_name", "name", "first_name"])}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      {pick(candidate, ["email", "phone"])}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {pick(candidate, ["source"])}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                        Details
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Open Positions section */}
      <section className="section-card">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-2.5 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Vacancies</p>
            <h3 className="text-2xl font-black text-slate-950">Open positions</h3>
          </div>
        </div>

        {!loading && openings.length === 0 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="mt-4 text-sm font-semibold text-slate-500">No job openings found in Supabase yet.</p>
          </div>
        )}

        {openings.length > 0 && (
          <div className="mt-6 rounded-[0.875rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-slate-600">Position</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-slate-600">Department</th>
                    <th className="px-5 py-3 font-bold uppercase tracking-wider text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {openings.map((opening, index) => {
                    const statusVal = pick(opening, ["status"]);
                    const statusClass =
                      statusVal.toLowerCase().includes("open") || statusVal.toLowerCase().includes("active")
                        ? "bg-emerald-100 text-emerald-700"
                        : statusVal.toLowerCase().includes("close") || statusVal.toLowerCase().includes("filled")
                        ? "bg-slate-100 text-slate-600"
                        : "bg-blue-100 text-blue-700";
                    return (
                      <tr key={String(opening.id ?? index)} className="cursor-pointer transition-colors hover:bg-gradient-to-r hover:from-slate-50 hover:to-white" onClick={() => setActiveRow(opening)}>
                        <td className="px-5 py-4 font-black text-slate-950">
                          {pick(opening, ["title", "position", "name"])}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-600">
                          {pick(opening, ["department"])}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}>
                            {statusVal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <RecordDetailsModal
        title={activeRow ? pick(activeRow, ["full_name", "name", "first_name"]) : "Candidate"}
        subtitle={activeRow ? `${pick(activeRow, ["source"])} · ${pick(activeRow, ["email", "phone"])}` : undefined}
        row={activeRow}
        isOpen={Boolean(activeRow)}
      />
    </div>
  );
}
