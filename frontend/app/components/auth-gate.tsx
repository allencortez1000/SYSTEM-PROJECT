"use client";

import type { ReactNode } from "react";
import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "./dashboard-shell";
import { NotificationProvider } from "./notification";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const mode: "signin" = "signin";

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("superadmin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function validateSavedSession() {
      const token = localStorage.getItem("hr_token");
      const user = localStorage.getItem("hr_user");

      if (!token || !user) {
        localStorage.removeItem("hr_token");
        localStorage.removeItem("hr_user");
        setIsAuthenticated(false);
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_user");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch {
        setError("Cannot connect to the backend. Check that the deployed API is running and NEXT_PUBLIC_API_URL is set correctly.");
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    validateSavedSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || "Unable to continue");
        return;
      }

      localStorage.setItem("hr_token", data.token);
      localStorage.setItem("hr_user", JSON.stringify(data.user));
      setIsAuthenticated(true);
    } catch {
      setError("Cannot connect to the backend. Check that the deployed API is running and NEXT_PUBLIC_API_URL is set correctly.");
    } finally {
      setLoading(false);
    }
  }

  function resetSigninDefaults() {
    setError("");
    setUsername("admin");
    setPassword("superadmin");
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="section-card max-w-md text-center">
          <p className="eyebrow">Loading</p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">Checking session...</h1>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32rem),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_30rem)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent" />

        <section className="relative z-10 grid w-full max-w-[min(96vw,72rem)] overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hidden min-h-[660px] flex-col justify-between bg-slate-950 p-9 text-white lg:flex">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-white p-1.5 shadow-sm ring-1 ring-white/10">
                  <img src="/rabino-logo.svg" alt="Rabino Home Builders Corporation logo" className="h-full w-full object-contain object-center" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase leading-tight tracking-[0.18em] text-sky-300/90 sm:text-[11px]">
                    Rabino Home Builders Corporation
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-tight text-slate-300/90 sm:text-[13px]">
                    Turning dreams into possibilities.
                  </p>
                </div>
              </div>

              <div className="mt-10 max-w-xl">
                <p className="eyebrow text-sky-300/90">HR Command Center</p>
                <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-[3.3rem]">
                  Secure access to your payroll operations.
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300/90 sm:text-base">
                  Sign in to manage employees, attendance, payroll, recruitment,
                  reports, compliance, and admin controls in one place.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { title: "PHP Payroll", value: "₱", tone: "from-blue-600 to-cyan-500" },
                { title: "Deductions", value: "SSS", tone: "from-slate-700 to-slate-600" },
                { title: "Corporate Portal", value: "RHBC", tone: "from-blue-500 to-sky-500" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4 shadow-lg shadow-black/10 backdrop-blur-sm">
                  <div className={`inline-flex rounded-xl bg-gradient-to-r ${item.tone} px-3 py-1 text-lg font-black text-white`}>
                    {item.value}
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-300">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <div className="mx-auto flex min-h-[600px] w-full max-w-[32rem] flex-col justify-center gap-0">
              <div className="mb-4 lg:hidden">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm">
                    <img src="/rabino-logo.svg" alt="Rabino Home Builders Corporation logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase leading-tight tracking-[0.22em] text-sky-500">
                      Rabino Home Builders Corporation
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold leading-tight text-slate-500">
                      HR Command Center
                    </p>
                  </div>
                </div>
              </div>

              <p className="eyebrow">{mode === "signin" ? "Sign in required" : "Create account"}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {mode === "signin" ? "Welcome back" : "Sign up"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {mode === "signin"
                  ? "Enter your credentials before using the system."
                  : "Create an account. It will be saved in Supabase."}
              </p>

              {mode === "signin" && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 text-sm text-blue-800 shadow-sm">
                  <p className="font-black">Login required</p>
                  <p className="mt-1">Use your assigned username and password to sign in.</p>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-xs font-semibold leading-5 text-slate-600 shadow-sm">
                Public signup is disabled. Only the super admin can create department head admins.
                <button
                  type="button"
                  onClick={resetSigninDefaults}
                  className="ml-2 mt-2 inline-flex rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Reset super admin defaults
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4.5">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="admin"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Password</span>
                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      placeholder="superadmin"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-2 my-auto inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.52 19.5 12 19.5c1.658 0 3.245-.404 4.646-1.127m3.447-2.86A10.49 10.49 0 0 0 22.066 12C20.774 7.662 16.48 4.5 12 4.5c-1.279 0-2.513.226-3.668.644m0 0L9.5 6.312m-1.168-.668L4.5 3m15 18-3.75-3.75m0 0A3 3 0 0 1 12 15a3 3 0 0 1-3-3m9.75 0a7.5 7.5 0 0 0-10.5-6.75" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-1.657 3.97-7.5 9.75-7.5S21.75 10.343 21.75 12 17.78 19.5 12 19.5 2.25 13.657 2.25 12Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>

                {error && (
                  <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-sm">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="primary-button w-full">
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <NotificationProvider>
      <DashboardShell>{children}</DashboardShell>
    </NotificationProvider>
  );
}
