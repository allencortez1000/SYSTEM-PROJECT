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
  const [password, setPassword] = useState("admin");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        setError("Cannot connect to the backend. Make sure npm run dev is running.");
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
      const endpoint = "/api/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || "Unable to continue");
        return;
      }

      localStorage.setItem("hr_token", data.token);
      localStorage.setItem("hr_user", JSON.stringify(data.user));
      setIsAuthenticated(true);
    } catch (err) {
      setError("Cannot connect to the backend. Make sure npm run dev is running.");
    } finally {
      setLoading(false);
    }
  }

  function resetSigninDefaults() {
    setError("");
    setUsername("admin");
    setPassword("admin");
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34rem),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_34rem)]" />

        <section className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:grid-cols-[1fr_0.9fr]">
          <div className="hidden min-h-[620px] bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <img
                  src="/rabino-logo.svg"
                  alt="Rabino Home Builders Corporation logo"
                  className="h-20 w-20 rounded-[1.5rem] bg-white object-contain p-2 shadow-2xl shadow-black/30"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-300">
                    Rabino Home Builders Corporation
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    Turning dreams into possibilities.
                  </p>
                </div>
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight">
                Secure access to your Philippine payroll system.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Sign in to manage employees, attendance, payroll, recruitment,
                reports, and compliance.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">₱</p>
                <p className="mt-2 text-xs font-bold text-slate-300">PHP Payroll</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">SSS</p>
                <p className="mt-2 text-xs font-bold text-slate-300">Deductions</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">RHBC</p>
                <p className="mt-2 text-xs font-bold text-slate-300">Corporate Portal</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto flex min-h-[560px] max-w-md flex-col justify-center">
              <p className="eyebrow">{mode === "signin" ? "Sign in required" : "Create account"}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {mode === "signin" ? "Welcome back" : "Sign up"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {mode === "signin"
                  ? "Enter your credentials before using the system."
                  : "Create an account. It will be saved in Supabase."}
              </p>

              {mode === "signin" && (
                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-black">Default credentials</p>
                  <p className="mt-1">
                    Username: <span className="font-black">admin</span>
                  </p>
                  <p>
                    Password: <span className="font-black">admin</span>
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                Public signup is disabled. Only the super admin can create department-head admins.
                <button
                  type="button"
                  onClick={resetSigninDefaults}
                  className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700"
                >
                  Reset admin defaults
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Username</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="admin"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Password</span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="admin"
                    required
                  />
                </label>

                {error && (
                  <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
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
