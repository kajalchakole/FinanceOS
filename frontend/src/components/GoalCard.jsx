import React from "react";
import { Link } from "react-router-dom";

function GoalCard({ goal, onDelete, isDeleting = false }) {
  const projection = goal.projection || {};
  const isOnTrack = projection.status === "On Track";
  const isGoalMet = projection.status === "Goal Met";
  const isExpired = projection.status === "Expired";
  const gapClassName = projection.gap >= 0 ? "text-emerald-600" : "text-rose-600";
  const statusClassName = isExpired
    ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/25 dark:text-yellow-400"
    : isGoalMet
      ? "bg-green-50 text-green-600 dark:bg-green-900/25 dark:text-green-400"
      : isOnTrack
      ? "bg-green-50 text-green-600 dark:bg-green-900/25 dark:text-green-400"
      : "bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-400";
  const statusLabel = isExpired ? "Year Passed" : (projection.status || "At Risk");

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

  return (
    <article className="app-surface-card p-6 transition-all duration-200 ease-out hover:-translate-y-[2px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-[#F3F4F6]">
            <Link to={`/goals/${goal._id}`} className="transition-all duration-200 ease-out hover:text-indigo-700 dark:hover:text-indigo-300">
              {goal.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm capitalize text-gray-500 dark:text-[#9CA3AF]">{goal.type}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-[#161D26] dark:text-[#9CA3AF]">
            {goal.targetYear}
          </span>
          <div className="flex items-center gap-2">
            <Link
              to={`/goals/${goal._id}/edit`}
              aria-label="Edit goal"
              title="Edit goal"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 transition-all duration-200 ease-out hover:bg-gray-100 dark:border-[#1F2937] dark:bg-[#161D26] dark:text-[#9CA3AF] dark:hover:bg-[#1A222C]"
            >
              <i className="bi bi-pencil text-[11px] leading-none" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(goal)}
              disabled={isDeleting}
              aria-label={isDeleting ? "Deleting goal" : "Delete goal"}
              title={isDeleting ? "Deleting..." : "Delete goal"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className={`bi ${isDeleting ? "bi-hourglass-split" : "bi-trash"} text-[11px] leading-none`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-[#6B7280]">Future Required</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{formatCurrency(projection.futureRequired)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-[#6B7280]">Projected Corpus</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{formatCurrency(projection.projectedCorpus)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-[#6B7280]">Gap</p>
            <p className={`mt-1 text-sm font-semibold ${gapClassName}`}>{formatCurrency(projection.gap)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-[#6B7280]">Status</p>
            <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default GoalCard;
