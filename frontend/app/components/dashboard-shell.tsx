"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardShellProps = {
  children: ReactNode;
};

const baseNavigation = [
  { href: "/", label: "Dashboard", icon: "◈" },
  { href: "/employees", label: "Employees", icon: "👥" },
  { href: "/attendance", label: "Attendance", icon: "⏱" },
  { href: "/payroll", label: "Payroll", icon: "💳" },
  { href: "/leave", label: "Leave", icon: "🌴" },
  { href: "/recruitment", label: "Recruitment", icon: "🎯" },
  { href: "/reports", label: "Reports", icon: "📊" },
  { href: "/compliance", label: "Compliance", icon: "🛡" },
];

type SessionUser = {
  name?: string;
  role?: string;
};

function labelFromRole(role?: string) {
  if (role === "super-admin") return "Super Admin";
  if (role === "department-head-admin") return "Department Head Admin";
  return "User";
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("hr_user");
    if (!raw) return;

    try {
      setSessionUser(JSON.parse(raw));
    } catch {
      setSessionUser(null);
    }
  }, []);

  const navigation =
    sessionUser?.role === "super-admin"
      ? [...baseNavigation, { href: "/admin-users", label: "Admin Access", icon: "🧩" }]
      : baseNavigation;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname?.startsWith(path + "/");
  };

  function handleLogout() {
    localStorage.removeItem("hr_token");
    localStorage.removeItem("hr_user");
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen text-slate-950">
      <div className="grid min-h-screen xl:grid-cols-[300px_1fr]">
        <aside className="relative hidden min-h-screen overflow-hidden border-r border-white/40 bg-slate-950 px-5 py-6 text-white xl:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_34%),radial-gradient(circle_at_70%_30%,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#111827_100%)]" />

          <div className="relative z-10 flex min-h-[calc(100vh-3rem)] flex-col">
            <Link href="/" className="group rounded-[1.75rem] border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-sky-200">PeopleOps</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">HR Command Center</h2>
              <p className="mt-2 text-sm text-slate-300">Payroll, talent, attendance, and compliance in one place.</p>
            </Link>

            <nav className="mt-7 space-y-1.5">
              {navigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition " +
                      (active
                        ? "bg-white text-slate-950 shadow-xl shadow-black/20"
                        : "text-slate-300 hover:bg-white/10 hover:text-white")
                    }
                  >
                    <span className={active ? "text-blue-600" : "text-slate-400"}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/20"
            >
              Logout
            </button>

            <div className="mt-auto rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                <p className="text-sm font-bold text-emerald-100">System online</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Version 0.1.0 is ready for HR operations.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="eyebrow">Welcome back</p>
                <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950">
                  Rabino Home Builders Corporation
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0">
                  <input
                    placeholder="Search people, payroll, reports..."
                    className="w-full min-w-0 rounded-full border border-slate-200 bg-white/90 px-5 py-3 pr-11 text-sm text-slate-700 shadow-sm sm:min-w-[280px]"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌕</span>
                </div>

                <button
                  type="button"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700"
                  aria-label="Notifications"
                >
                  🔔
                </button>

                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-xs font-black text-white">
                    AD
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-950">{sessionUser?.name || "User"}</p>
                    <p className="text-[11px] text-slate-500">{labelFromRole(sessionUser?.role)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8 xl:hidden">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "shrink-0 rounded-full px-4 py-2 text-sm font-bold " +
                    (isActive(item.href) ? "bg-slate-950 text-white" : "bg-white text-slate-600")
                  }
                >
                  {item.icon} {item.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-700"
              >
                Logout
              </button>
            </div>
          </header>

          <section className="px-4 py-6 sm:px-6 lg:px-8">{children}</section>
        </main>
      </div>
    </div>
  );
}
