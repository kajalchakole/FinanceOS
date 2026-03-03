import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import GoalCard from "../components/GoalCard";
import api from "../services/api";

const GOALS_VIEW_MODE_STORAGE_KEY = "goalsViewMode";
const CURRENT_YEAR = new Date().getFullYear();

const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
  maximumFractionDigits: 0
})}`;

const getProjectionMeta = (projection = {}) => {
  const isOnTrack = projection.status === "On Track";
  const isGoalMet = projection.status === "Goal Met";
  const isExpired = projection.status === "Expired";

  const statusClassName = isExpired
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : isGoalMet
      ? "border-teal-200 bg-teal-50 text-teal-700"
      : isOnTrack
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return {
    gapClassName: projection.gap >= 0 ? "text-emerald-600" : "text-rose-600",
    statusClassName,
    statusLabel: isExpired ? "Year Passed" : (projection.status || "At Risk")
  };
};

const getGoalStatusPriority = (status = "") => {
  switch (status) {
    case "At Risk":
      return 0;
    case "Expired":
      return 1;
    case "On Track":
      return 2;
    case "Goal Met":
      return 3;
    default:
      return 4;
  }
};

const getGoalInsightScore = (goal = {}) => {
  const projection = goal.projection || {};
  const gap = Number(projection.gap || 0);
  const shortfall = gap < 0 ? Math.abs(gap) : 0;
  const yearsRemaining = Math.max(0, Number(goal.targetYear || CURRENT_YEAR) - CURRENT_YEAR);
  const annualCatchUpNeed = shortfall / (yearsRemaining + 1);
  const statusPriority = getGoalStatusPriority(projection.status);

  return {
    statusPriority,
    annualCatchUpNeed,
    shortfall,
    targetYear: Number(goal.targetYear || 0),
    name: String(goal.name || "")
  };
};

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingGoalId, setDeletingGoalId] = useState("");
  const [goalPendingDelete, setGoalPendingDelete] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc"
  });
  const [viewMode, setViewMode] = useState(() => {
    const storedValue = String(window.localStorage.getItem(GOALS_VIEW_MODE_STORAGE_KEY) || "").toLowerCase();
    return storedValue === "grid" ? "grid" : "cards";
  });
  const deleteModalRef = useRef(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await api.get("/goals");
        setGoals(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load goals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  useEffect(() => {
    const handlePortfolioRefreshed = (event) => {
      const nextGoals = event.detail?.goals;

      if (Array.isArray(nextGoals)) {
        setGoals(nextGoals);
      }
    };

    window.addEventListener("portfolio:refreshed", handlePortfolioRefreshed);

    return () => {
      window.removeEventListener("portfolio:refreshed", handlePortfolioRefreshed);
    };
  }, []);

  const handleDeleteGoal = (goal) => {
    setDeleteModalError("");
    setGoalPendingDelete(goal);
  };

  const closeDeleteModal = () => {
    if (goalPendingDelete && deletingGoalId === goalPendingDelete._id) {
      return;
    }

    setGoalPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!goalPendingDelete) {
      return;
    }

    const goal = goalPendingDelete;
    setError("");
    setDeleteModalError("");
    setDeletingGoalId(goal._id);

    try {
      await api.delete(`/goals/${goal._id}`);
      setGoals((currentGoals) => currentGoals.filter((currentGoal) => currentGoal._id !== goal._id));
      setGoalPendingDelete(null);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to delete goal";
      setError(message);
      setDeleteModalError(message);
    } finally {
      setDeletingGoalId("");
    }
  };

  useEffect(() => {
    if (!goalPendingDelete) {
      return undefined;
    }

    const modalElement = deleteModalRef.current;

    if (modalElement) {
      const initialFocusElement = modalElement.querySelector("button");
      initialFocusElement?.focus();
    }

    const handleKeyDown = (event) => {
      if (!deleteModalRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeDeleteModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = deleteModalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [goalPendingDelete, deletingGoalId]);

  useEffect(() => {
    window.localStorage.setItem(GOALS_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const sortedGoals = useMemo(() => {
    const sorted = [...goals];

    sorted.sort((left, right) => {
      const leftProjection = left.projection || {};
      const rightProjection = right.projection || {};

      const leftValueByKey = {
        name: String(left.name || ""),
        currentCorpus: Number(left.currentCorpus || 0),
        targetYear: Number(left.targetYear || 0),
        futureRequired: Number(leftProjection.futureRequired || 0),
        projectedCorpus: Number(leftProjection.projectedCorpus || 0),
        gap: Number(leftProjection.gap || 0),
        status: String(leftProjection.status || "At Risk")
      }[sortConfig.key];

      const rightValueByKey = {
        name: String(right.name || ""),
        currentCorpus: Number(right.currentCorpus || 0),
        targetYear: Number(right.targetYear || 0),
        futureRequired: Number(rightProjection.futureRequired || 0),
        projectedCorpus: Number(rightProjection.projectedCorpus || 0),
        gap: Number(rightProjection.gap || 0),
        status: String(rightProjection.status || "At Risk")
      }[sortConfig.key];

      if (typeof leftValueByKey === "string" || typeof rightValueByKey === "string") {
        return String(leftValueByKey).localeCompare(String(rightValueByKey), undefined, { sensitivity: "base" });
      }

      return Number(leftValueByKey || 0) - Number(rightValueByKey || 0);
    });

    return sortConfig.direction === "asc" ? sorted : sorted.reverse();
  }, [goals, sortConfig.direction, sortConfig.key]);

  const cardGoals = useMemo(() => {
    const sorted = [...goals];

    sorted.sort((left, right) => {
      const leftScore = getGoalInsightScore(left);
      const rightScore = getGoalInsightScore(right);

      if (leftScore.statusPriority !== rightScore.statusPriority) {
        return leftScore.statusPriority - rightScore.statusPriority;
      }

      if (leftScore.annualCatchUpNeed !== rightScore.annualCatchUpNeed) {
        return rightScore.annualCatchUpNeed - leftScore.annualCatchUpNeed;
      }

      if (leftScore.shortfall !== rightScore.shortfall) {
        return rightScore.shortfall - leftScore.shortfall;
      }

      if (leftScore.targetYear !== rightScore.targetYear) {
        return leftScore.targetYear - rightScore.targetYear;
      }

      return leftScore.name.localeCompare(rightScore.name, undefined, { sensitivity: "base" });
    });

    return sorted;
  }, [goals]);

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc"
        };
      }

      return {
        key,
        direction: "asc"
      };
    });
  };

  const getSortIndicator = (key) => (sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : "");

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Goals</h2>
          <p className="mt-1 text-sm text-brand-muted">Manage your financial goals.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl border border-brand-line bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "cards" ? "bg-slate-900 text-white" : "text-brand-muted hover:bg-slate-50"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "grid" ? "bg-slate-900 text-white" : "text-brand-muted hover:bg-slate-50"
              }`}
            >
              Grid
            </button>
          </div>

          <Link
            to="/goals/new"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            New Goal
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading goals...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {!isLoading && !error && goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No goals created yet
        </div>
      ) : null}

      {!isLoading && !error && goals.length > 0 && viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cardGoals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onDelete={handleDeleteGoal}
              isDeleting={deletingGoalId === goal._id}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !error && goals.length > 0 && viewMode === "grid" ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
          <div className="overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("name")} className="font-semibold">Goal{getSortIndicator("name")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("currentCorpus")} className="font-semibold">Current Accumulated Corpus{getSortIndicator("currentCorpus")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("targetYear")} className="font-semibold">Target Year{getSortIndicator("targetYear")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("futureRequired")} className="font-semibold">Future Required{getSortIndicator("futureRequired")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("projectedCorpus")} className="font-semibold">Projected Corpus{getSortIndicator("projectedCorpus")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("gap")} className="font-semibold">Gap{getSortIndicator("gap")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("status")} className="font-semibold">Status{getSortIndicator("status")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {sortedGoals.map((goal) => {
                  const projection = goal.projection || {};
                  const { gapClassName, statusClassName, statusLabel } = getProjectionMeta(projection);

                  return (
                    <tr key={goal._id}>
                      <td className="px-5 py-3 text-brand-text">
                        <Link to={`/goals/${goal._id}`} className="font-medium transition hover:text-slate-700">
                          {goal.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(goal.currentCorpus)}</td>
                      <td className="px-5 py-3 text-brand-muted">{goal.targetYear}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(projection.futureRequired)}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(projection.projectedCorpus)}</td>
                      <td className={`px-5 py-3 font-semibold ${gapClassName}`}>{formatCurrency(projection.gap)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClassName}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/goals/${goal._id}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line bg-slate-50 text-brand-muted transition hover:bg-slate-100"
                            aria-label="Edit goal"
                            title="Edit goal"
                          >
                            <i className="bi bi-pencil text-xs leading-none" aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(goal)}
                            disabled={deletingGoalId === goal._id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={deletingGoalId === goal._id ? "Deleting goal" : "Delete goal"}
                            title={deletingGoalId === goal._id ? "Deleting..." : "Delete goal"}
                          >
                            <i
                              className={`bi ${deletingGoalId === goal._id ? "bi-hourglass-split" : "bi-trash"} text-xs leading-none`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {goalPendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-goal-title"
            className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
          >
            <h3 id="delete-goal-title" className="text-lg font-semibold tracking-tight text-brand-text">Delete Goal</h3>
            <p className="mt-2 text-sm text-brand-muted">
              Are you sure you want to delete
              {" "}
              <span className="font-semibold text-brand-text">"{goalPendingDelete.name}"</span>
              ?
              This action cannot be undone.
            </p>

            {deleteModalError ? <p className="mt-3 text-sm font-medium text-rose-600">{deleteModalError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingGoalId === goalPendingDelete._id}
                className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingGoalId === goalPendingDelete._id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingGoalId === goalPendingDelete._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GoalsPage;

