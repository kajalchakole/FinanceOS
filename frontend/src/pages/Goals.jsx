import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import GoalCard from "../components/GoalCard";
import api from "../services/api";

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingGoalId, setDeletingGoalId] = useState("");
  const [goalPendingDelete, setGoalPendingDelete] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState("");
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

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Goals</h2>
          <p className="mt-1 text-sm text-brand-muted">Manage your financial goals.</p>
        </div>

        <Link
          to="/goals/new"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New Goal
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading goals...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {!isLoading && !error && goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No goals created yet
        </div>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onDelete={handleDeleteGoal}
              isDeleting={deletingGoalId === goal._id}
            />
          ))}
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
