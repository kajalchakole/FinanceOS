import React from "react";

function DashboardPage() {
  const cards = [
    "Total Net Worth",
    "Monthly Savings",
    "Goal Progress",
    "Asset Allocation"
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Dashboard</h2>
        <p className="mt-1 text-sm text-brand-muted">Your KPI snapshots will appear here.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((title) => (
          <article key={title} className="rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft">
            <p className="text-sm text-brand-muted">{title}</p>
            <div className="mt-8 h-12 rounded-lg bg-slate-100" />
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardPage;
