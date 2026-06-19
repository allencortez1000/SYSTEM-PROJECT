"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [candRes, openRes] = await Promise.all([
          fetch(`${API_BASE}/data/candidates`),
          fetch(`${API_BASE}/data/job-openings`),
        ]);
        if (!candRes.ok) throw new Error("Failed to load candidates");
        const candData = await candRes.json();
        setCandidates(candData.candidates || []);
        if (openRes.ok) {
          const openData = await openRes.json();
          setOpenings(openData.jobOpenings || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(
    () => [
      ["Open roles", String(openings.length)],
      ["Candidates", String(candidates.length)],
    ] as const,
    [openings, candidates],
  );

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Recruitment pipeline</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Hire with visibility</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Live candidates and open roles pulled from your Supabase database.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="section-card">
        <p className="eyebrow">Candidates</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Talent shortlist</h3>

        {loading && <p className="mt-6 text-slate-600">Loading candidates...</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">Error: {error}</p>}
        {!loading && candidates.length === 0 && (
          <p className="mt-6 text-sm text-slate-500">No candidates found in Supabase yet.</p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate, index) => (
            <div key={index} className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm">
              <p className="font-black text-slate-950">
                {pick(candidate, ["full_name", "name", "first_name"])}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {pick(candidate, ["email", "phone"])}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {pick(candidate, ["source"])}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
