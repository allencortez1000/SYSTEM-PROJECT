"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Employee = {
  id: number;
  fullName: string;
  position?: string;
};

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("http://localhost:4000/api/employees");
        if (!res.ok) throw new Error("Failed to load candidates");
        const data = await res.json();
        setCandidates(data.employees || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Recruitment pipeline</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Hire with visibility</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Track candidates, hiring stages, and open roles with a cleaner applicant workspace.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Open roles", 12],
          ["Candidates", candidates?.length ?? 0],
          ["Interviews", 24],
          ["Offers", 5],
        ].map(([label, value]) => (
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {candidates?.map((candidate) => (
            <Link key={candidate.id} href={`/employees/${candidate.id}`} className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="font-black text-slate-950">{candidate.fullName}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{candidate.position || "Candidate"}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">Screening</span>
                <span className="text-sm font-bold text-slate-400">View →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
