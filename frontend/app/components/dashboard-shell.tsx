"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardShellProps = { children: ReactNode };

type SessionUser = { name?: string; role?: string };

function labelFromRole(role?: string) {
  if (role === "super-admin") return "Super Admin";
  if (role === "department-head-admin") return "Dept. Head Admin";
  if (role === "sub-admin") return "Sub Admin";
  return "User";
}

type NavItem = { href: string; label: string; icon: ReactNode };

function NavIcon({ path }: { path: string }) {
  return (
    <svg className="h-[1.0625rem] w-[1.0625rem] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const NAV_ICONS: Record<string, string> = {
  "/":            "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
  "/employees":   "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  "/attendance":  "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  "/payroll":     "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
  "/leave":       "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  "/recruitment": "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z",
  "/reports":     "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  "/compliance":  "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  "/admin-users": "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
};

const baseNavigation: NavItem[] = [
  { href: "/",            label: "Dashboard",    icon: <NavIcon path={NAV_ICONS["/"]} /> },
  { href: "/employees",   label: "Employees",    icon: <NavIcon path={NAV_ICONS["/employees"]} /> },
  { href: "/attendance",  label: "Attendance",   icon: <NavIcon path={NAV_ICONS["/attendance"]} /> },
  { href: "/payroll",     label: "Payroll",      icon: <NavIcon path={NAV_ICONS["/payroll"]} /> },
  { href: "/leave",       label: "Leave",        icon: <NavIcon path={NAV_ICONS["/leave"]} /> },
  { href: "/recruitment", label: "Recruitment",  icon: <NavIcon path={NAV_ICONS["/recruitment"]} /> },
  { href: "/reports",     label: "Reports",      icon: <NavIcon path={NAV_ICONS["/reports"]} /> },
  { href: "/compliance",  label: "Compliance",   icon: <NavIcon path={NAV_ICONS["/compliance"]} /> },
];

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("hr_user");
    if (!raw) return;
    try { setSessionUser(JSON.parse(raw)); } catch { setSessionUser(null); }
  }, []);

  const navigation: NavItem[] =
    sessionUser?.role === "super-admin"
      ? [...baseNavigation, { href: "/admin-users", label: "Admin Access", icon: <NavIcon path={NAV_ICONS["/admin-users"]} /> }]
      : baseNavigation;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname?.startsWith(path + "/");
  };

  function handleLogout() {
    localStorage.removeItem("hr_token");
    localStorage.removeItem("hr_user");
    window.location.href = "/login";
  }

  const initials = (sessionUser?.name || "?")
    .split(" ").map((n: string) => n?.[0] ?? "").filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-950">
      {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[#0f172a] text-white xl:flex">
          {/* Branding */}
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <img
              src="/rabino-logo.svg"
              alt="RHBC logo"
              className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rabino Home Builders
              </p>
              <p className="truncate text-sm font-bold text-white">HR Command Center</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Navigation
            </p>
            <ul className="space-y-0.5">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all " +
                        (active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:bg-white/8 hover:text-white hover:translate-x-0.5")
                      }
                    >
                      <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}>
                        {item.icon}
                      </span>
                      {item.label}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info block */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-[11px] font-black text-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-bold text-white leading-none">{sessionUser?.name || "User"}</p>
                <p className="truncate text-[10px] text-slate-400 leading-none mt-0.5">{labelFromRole(sessionUser?.role)}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-red-400"
                aria-label="Sign out"
                title="Sign out"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          </div>

          {/* System status */}
          <div className="border-t border-white/10 px-4 py-4">
            <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 px-3 py-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-300">System online</p>
                <p className="truncate text-[10px] text-slate-400">v0.1.0 · All systems go</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <div className="min-h-screen xl:pl-[260px]">

          {/* ── Top header ─────────────────────────────────── */}
          <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:hidden"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Logo (mobile) */}
            <div className="flex items-center gap-2 xl:hidden">
              <img src="/rabino-logo.svg" alt="RHBC" className="h-7 w-7 rounded-lg bg-white object-contain p-0.5 shadow-sm border border-slate-200" />
              <span className="text-sm font-bold text-slate-900">HR System</span>
            </div>

            {/* Search + breadcrumb */}
            <div className="relative hidden flex-1 max-w-sm sm:block">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="search"
                placeholder="Search people, payroll, reports…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Page breadcrumb (xl only) */}
            {(() => {
              const currentLabel = navigation.find(item => isActive(item.href))?.label ?? "";
              return currentLabel ? (
                <div className="hidden items-center gap-1.5 xl:flex">
                  <span className="text-slate-300 text-sm select-none">/</span>
                  <span className="text-sm font-semibold text-slate-700">{currentLabel}</span>
                </div>
              ) : null;
            })()}

            <div className="ml-auto flex items-center gap-2">
              {/* Notification bell */}
              <button
                type="button"
                aria-label="Notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <svg className="h-4.5 w-4.5 h-[1.125rem] w-[1.125rem]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </button>

              {/* User chip */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 text-[11px] font-black text-white">
                  {initials}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="truncate text-xs font-semibold text-slate-900 leading-none">{sessionUser?.name || "User"}</p>
                  <p className="truncate text-[10px] text-slate-400 leading-none mt-0.5">{labelFromRole(sessionUser?.role)}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:inline-flex"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Logout
              </button>
            </div>
          </header>

          {/* ── Mobile nav drawer ───────────────────────────── */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 xl:hidden">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-72 bg-[#0f172a] text-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img src="/rabino-logo.svg" alt="RHBC" className="h-9 w-9 rounded-xl bg-white object-contain p-1" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rabino HB</p>
                      <p className="text-sm font-bold">HR Command Center</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <nav className="px-3 py-4">
                  <ul className="space-y-0.5">
                    {navigation.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all " +
                              (active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white")
                            }
                          >
                            <span className={active ? "text-white" : "text-slate-400"}>{item.icon}</span>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                      >
                        <svg className="h-[1.0625rem] w-[1.0625rem]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                        Logout
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}

          {/* ── Page content ────────────────────────────────── */}
          <main>
            {children}
          </main>
        </div>
    </div>
  );
}
