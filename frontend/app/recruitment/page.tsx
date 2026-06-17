"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Employee = { id: number; fullName: string; position?: string };

export default function RecruitmentPage() {
  const [candidates, setCandidates] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('http://localhost:4000/api/employees');
        if (!res.ok) throw new Error('Failed to load candidates');
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold">Recruitment</h1>
        <p className="mt-2 text-slate-600">Candidates and applicant tracking</p>

        {loading && <p className="mt-4 text-slate-600">Loading candidates...</p>}
        {error && <p className="mt-4 text-red-600">Error: {error}</p>}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {candidates?.map((c) => (
            <Link key={c.id} href={`/employees/${c.id}`} className="block rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition">
              <div className="text-sm font-semibold">{c.fullName}</div>
              <div className="text-sm text-slate-500">{c.position}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
