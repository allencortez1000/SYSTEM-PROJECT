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

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    setUsername("");
    setPassword("");
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30rem),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28rem)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/85 to-transparent" />

        <section className="relative z-10 w-full max-w-[min(94vw,40rem)] overflow-hidden rounded-[2rem] border border-white/80 bg-white/96 shadow-[0_32px_100px_rgba(15,23,42,0.14)] backdrop-blur-2xl ring-1 ring-slate-100/70">
          <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <div className="mx-auto flex min-h-[620px] w-full max-w-[38rem] flex-col justify-center">
              <div className="relative mb-10 flex items-start gap-5 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/90 px-5 py-4 shadow-sm ring-1 ring-slate-100">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-blue-700 via-blue-600 to-cyan-500" />
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <img src="/rabino-logo.svg" alt="Rabino Home Builders Corporation logo" className="h-full w-full object-contain object-center" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-[15px] font-black uppercase leading-tight tracking-[0.48em] text-blue-700 sm:text-[16px]">
                    Rabino Home Builders Corporation
                  </p>
                  <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-[14px]">
                    HR Command Center
                  </p>
                </div>
              </div>

              <div className="mb-6 lg:hidden">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-2.5 shadow-sm">
                    <img src="/rabino-logo.svg" alt="Rabino Home Builders Corporation logo" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black uppercase leading-tight tracking-[0.28em] text-blue-700">
                      Rabino Home Builders Corporation
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-tight text-slate-600">
                      HR Command Center
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="eyebrow text-blue-700">Sign in required</p>
                <p className="max-w-xl text-sm leading-6 text-slate-600">
                  {mode === "signin"
                    ? "Enter your credentials to access the system."
                    : "Create an account. It will be saved in Supabase."}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                  <p className="font-black uppercase tracking-[0.16em] text-blue-700">System access notice</p>
                  <p className="mt-1 text-slate-600">Use your assigned username and password to sign in. Public signup is disabled, and only the super admin can create department head admins.</p>
                </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold tracking-[0.01em] text-slate-800">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10"
                    placeholder="Username"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold tracking-[0.01em] text-slate-800">Password</span>
                  <div className="relative mt-2">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10"
                      placeholder="Password"
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

                <button type="submit" disabled={loading} className="primary-button w-full py-3.5 text-base shadow-lg shadow-blue-700/25 ring-1 ring-blue-600/10">
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
