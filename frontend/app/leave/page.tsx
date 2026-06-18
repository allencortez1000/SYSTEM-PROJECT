const leaveItems = [
  ["Pending requests", "18", "Needs manager review"],
  ["Approved this month", "42", "Across 8 departments"],
  ["Average balance", "14.6", "Days per employee"],
];

export default function LeavePage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Leave management</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Balance time off and coverage</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Monitor leave utilization, pending requests, and team availability from one focused workspace.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {leaveItems.map(([label, value, detail]) => (
          <div key={label} className="metric-card">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p>
          </div>
        ))}
      </section>

      <section className="section-card">
        <p className="eyebrow">Requests</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Upcoming time off</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Annual leave", "Sick leave", "Parental leave"].map((type) => (
            <div key={type} className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
              <p className="font-black text-slate-950">{type}</p>
              <p className="mt-2 text-sm text-slate-500">Request workflow and balance details will appear here.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
