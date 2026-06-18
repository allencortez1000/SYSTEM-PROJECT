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
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("admin");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("hr_token");
    const user = localStorage.getItem("hr_user");

    setIsAuthenticated(Boolean(token && user));
    setCheckingAuth(false);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint =
        mode === "signin"
          ? "http://localhost:4000/api/auth/login"
          : "http://localhost:4000/api/auth/signup";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          mode === "signin"
            ? {
                username,
                password,
              }
            : {
                fullName,
                username,
                email,
                password,
              },
        ),
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

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError("");

    if (nextMode === "signin") {
      setUsername("admin");
      setPassword("admin");
    } else {
      setUsername("");
      setPassword("");
    }
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
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-300">
                HR & Payroll
              </p>
              <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight">
                Secure access to your Philippine payroll system.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Sign in or create an account to manage employees, attendance,
                payroll, recruitment, reports, and compliance.
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
                <p className="text-2xl font-black">HR</p>
                <p className="mt-2 text-xs font-bold text-slate-300">Workspace</p>
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

              <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={
                    "rounded-full px-4 py-2 text-sm font-black transition " +
                    (mode === "signin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")
                  }
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={
                    "rounded-full px-4 py-2 text-sm font-black transition " +
                    (mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")
                  }
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {mode === "signup" && (
                  <>
                    <label className="block">
                      <span className="text-sm font-bold text-slate-600">Full name</span>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="Juan Dela Cruz"
                        required
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-bold text-slate-600">Email</span>
                      <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder="you@example.com"
                        required
                      />
                    </label>
                  </>
                )}

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
                  {loading
                    ? mode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
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
