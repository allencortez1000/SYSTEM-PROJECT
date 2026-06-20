"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotification } from "../components/notification";

const statusOptions = ["Present", "Absent", "Leave", "Remote"] as const;

type AttendanceRecord = {
  id: number;
  employeeName: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
};

const statusClass: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700",
  Absent: "bg-red-50 text-red-700",
  Leave: "bg-amber-50 text-amber-700",
  Remote: "bg-blue-50 text-blue-700",
};

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeName: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Present",
    checkIn: "09:00",
    checkOut: "17:00",
    notes: "",
  });
  const { notify } = useNotification();

  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Leave: 0, Remote: 0 };
    records.forEach((record) => {
      const status = record.status as keyof typeof counts;
      if (status in counts) counts[status] += 1;
    });
    return counts;
  }, [records]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/attendance");
        if (!res.ok) throw new Error("Failed to load attendance");
        const data = await res.json();
        setRecords(data.attendance || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Could not add attendance");

      setRecords((prev) => [data.record, ...prev]);
      setForm((prev) => ({ ...prev, employeeName: "", notes: "" }));
      notify("Attendance record added");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Attendance hub</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Track time, presence, and work modes</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Capture daily attendance, remote work, absences, and leave status with a polished operational view.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {Object.entries(summary).map(([status, value]) => (
          <div key={status} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{status}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="section-card space-y-4">
          <div>
            <p className="eyebrow">New record</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Add attendance</h3>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-600">Employee name</span>
            <input value={form.employeeName} onChange={(event) => handleChange("employeeName", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Date</span>
              <input type="date" value={form.date} onChange={(event) => handleChange("date", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Status</span>
              <select value={form.status} onChange={(event) => handleChange("status", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Check-in</span>
              <input type="time" value={form.checkIn} onChange={(event) => handleChange("checkIn", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Check-out</span>
              <input type="time" value={form.checkOut} onChange={(event) => handleChange("checkOut", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-600">Notes</span>
            <textarea value={form.notes} onChange={(event) => handleChange("notes", event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
          </label>

          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

          <button type="submit" className="primary-button w-full">Add attendance record</button>
        </form>

        <section className="section-card overflow-hidden">
          <div>
            <p className="eyebrow">Latest records</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Attendance timeline</h3>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-100">
            <table className="soft-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-slate-500">Loading attendance...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate-500">No attendance records yet.</td></tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="font-bold text-slate-950">{record.employeeName}</td>
                      <td className="text-slate-600">{record.date}</td>
                      <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[record.status] || "bg-slate-100 text-slate-700"}`}>{record.status}</span></td>
                      <td className="text-slate-600">{record.checkIn || "—"}</td>
                      <td className="text-slate-600">{record.checkOut || "—"}</td>
                      <td className="text-slate-600">{record.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}
