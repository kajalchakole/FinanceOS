import React from "react";

function GoalCard({ goal }) {
  return (
    <article className="rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-brand-text">{goal.name}</h3>
          <p className="mt-1 text-sm capitalize text-brand-muted">{goal.type}</p>
        </div>
        <span className="rounded-lg border border-brand-line bg-slate-50 px-3 py-1 text-xs font-semibold text-brand-muted">
          {goal.targetYear}
        </span>
      </div>

      <p className="mt-6 text-sm text-brand-muted">Present Value</p>
      <p className="text-xl font-semibold text-brand-text">
        {"\u20B9"}{Number(goal.presentValue || 0).toLocaleString("en-IN")}
      </p>
    </article>
  );
}

export default GoalCard;
