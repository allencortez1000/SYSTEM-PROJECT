"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RecordDetailsModal from "../components/record-details-modal";
import { useSupabaseTableRefresh } from "../../lib/supabaseRealtime";

const API_BASE = "/api";

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
  const [activeRow, setActiveRow] = useState<LeaveRow | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem("hr_token");
      const res = await fetch(`${API_BASE}/data/leave`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (!res.ok) throw new Error("Failed to load leave requests");
      const data = await res.json();
      setRows(data.leave || []);
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

  useSupabaseTableRefresh([{ table: "leave_requests" }, { table: "employees" }], () => {
    void load();
  });

  const summary = useMemo(() => {
    const pending = rows.filter((r) => pick(r, ["status"]).toLowerCase() === "pending").length;
    const approved = rows.filter((r) => pick(r, ["status"]).toLowerCase() === "approved").length;
    const rejected = rows.filter((r) => pick(r, ["status"]).toLowerCase() === "rejected").length;
    return [
      {
        label: "Total requests",
        value: String(rows.length),
        detail: "Stored in Supabase",
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        ),
        gradient: "from-blue-500 to-cyan-500",
        bgGradient: "from-blue-50 to-cyan-50",
      },
      {
        label: "Pending",
        value: String(pending),
        detail: "Awaiting manager review",
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
        gradient: "from-blue-600 to-cyan-500",
        bgGradient: "from-blue-50 to-cyan-50",
      },
      {
        label: "Approved",
        value: String(approved),
        detail: "Confirmed time off",
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
      },
      {
        label: "Rejected",
        value: String(rejected),
        detail: "Declined requests",
        icon: (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
        gradient: "from-red-500 to-rose-500",
        bgGradient: "from-red-50 to-rose-50",
      },
    ];
  }, [rows]);

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leave Management</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Leave Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Live leave requests with real-time updates.</p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ label, value, detail, icon }) => {
          const iconBg =
            label === "Approved"
              ? "bg-emerald-50 text-emerald-600"
              : label === "Rejected"
              ? "bg-red-50 text-red-600"
              : label === "Pending"
              ? "bg-amber-50 text-amber-600"
              : "bg-blue-50 text-blue-600";
          return (
            <div
              key={label}
              className="rounded-[0.875rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-px hover:shadow-md"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                {icon}
              </div>
              <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
            </div>
          );
        })}
      </section>

      <section className="section-card">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 p-2.5 text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Requests</p>
            <h3 className="text-2xl font-black text-slate-950">Leave requests</h3>
          </div>
        </div>

        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold text-blue-700">Loading leave requests...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="mt-4 text-sm font-semibold text-slate-500">No leave requests found in Supabase yet.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-6 rounded-[0.875rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="soft-table">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <th className="font-black">Employee</th>
                    <th className="font-black">Type</th>
                    <th className="font-black">Start</th>
                    <th className="font-black">End</th>
                    <th className="font-black">Days</th>
                    <th className="font-black">Status</th>
                    <th className="font-black">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {rows.map((row, index) => (
                    <tr
                      key={String(row.id ?? index)}
                      className={`cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                        activeRow === row ? "bg-gradient-to-r from-blue-100 to-indigo-100" : ""
                      }`}
                      onClick={() => setActiveRow(row)}
                    >
                      <td className="font-bold text-slate-950">{nested(row, "employees", "full_name")}</td>
                      <td className="text-slate-700">{nested(row, "leave_types", "name")}</td>
                      <td className="text-slate-600">{pick(row, ["start_date"])}</td>
                      <td className="text-slate-600">{pick(row, ["end_date"])}</td>
                      <td className="font-bold text-slate-700">{pick(row, ["total_days"])}</td>
                      <td>
                        {(() => {
                          const status = pick(row, ["status"]).toLowerCase();
                          const colorClass =
                            status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700";
                          return (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
                              {pick(row, ["status"])}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveRow(row);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            View details
                          </button>
                          {String(pick(row, ["status"]) || "").toLowerCase() === "pending" && (
                            <>
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              try {
                                const token = localStorage.getItem("auth_token");
                                const res = await fetch(`${API_BASE}/data/leave/${String(row.id)}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({ status: "approved" }),
                                });
                                if (!res.ok) throw new Error(await res.text());
                                await load();
                              } catch (err) {
                                setError(`Approve failed: ${(err as Error).message}`);
                              }
                            }}
                            className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              try {
                                const token = localStorage.getItem("auth_token");
                                const res = await fetch(`${API_BASE}/data/leave/${String(row.id)}`, {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({ status: "rejected" }),
                                });
                                if (!res.ok) throw new Error(await res.text());
                                await load();
                              } catch (err) {
                                setError(`Reject failed: ${(err as Error).message}`);
                              }
                            }}
                            className="inline-flex items-center rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-red-600 hover:shadow-md"
                          >
                            Reject
                          </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <RecordDetailsModal
        title={activeRow ? nested(activeRow, "employees", "full_name") : "Leave request"}
        subtitle={activeRow ? `${nested(activeRow, "leave_types", "name")} · ${pick(activeRow, ["status"])} ` : undefined}
        row={activeRow}
        isOpen={Boolean(activeRow)}
      />
    </div>
  );
}
