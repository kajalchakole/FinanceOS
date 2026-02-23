import React from "react";

function GoalCard({ goal, onDelete, isDeleting = false }) {
  const projection = goal.projection || {};
  const isOnTrack = projection.status === "On Track";
  const isExpired = projection.status === "Expired";
  const gapClassName = projection.gap >= 0 ? "text-emerald-600" : "text-rose-600";
  const statusClassName = isExpired
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : isOnTrack
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  const statusLabel = isExpired ? "Year Passed" : (projection.status || "At Risk");

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

  return (
    <article className="rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-brand-text">{goal.name}</h3>
          <p className="mt-1 text-sm capitalize text-brand-muted">{goal.type}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-lg border border-brand-line bg-slate-50 px-3 py-1 text-xs font-semibold text-brand-muted">
            {goal.targetYear}
          </span>
          <button
            type="button"
            onClick={() => onDelete(goal)}
            disabled={isDeleting}
            aria-label={isDeleting ? "Deleting goal" : "Delete goal"}
            title={isDeleting ? "Deleting..." : "Delete goal"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className="bi bi-trash text-[11px] leading-none" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-muted">Future Required</p>
            <p className="mt-1 text-sm font-semibold text-brand-text">{formatCurrency(projection.futureRequired)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-muted">Projected Corpus</p>
            <p className="mt-1 text-sm font-semibold text-brand-text">{formatCurrency(projection.projectedCorpus)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-muted">Gap</p>
            <p className={`mt-1 text-sm font-semibold ${gapClassName}`}>{formatCurrency(projection.gap)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-muted">Status</p>
            <span className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default GoalCard;
