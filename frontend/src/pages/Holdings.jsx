import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

function HoldingsPage() {
  const [holdings, setHoldings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingHoldingId, setDeletingHoldingId] = useState("");
  const [holdingPendingDelete, setHoldingPendingDelete] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState("");
  const deleteModalRef = useRef(null);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const response = await api.get("/holdings");
        setHoldings(response.data || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load holdings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHoldings();
  }, []);

  const handleDeleteHolding = (holding) => {
    setDeleteModalError("");
    setHoldingPendingDelete(holding);
  };

  const closeDeleteModal = () => {
    if (holdingPendingDelete && deletingHoldingId === holdingPendingDelete._id) {
      return;
    }

    setHoldingPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!holdingPendingDelete) {
      return;
    }

    const holding = holdingPendingDelete;
    setError("");
    setDeleteModalError("");
    setDeletingHoldingId(holding._id);

    try {
      await api.delete(`/holdings/${holding._id}`);
      setHoldings((currentHoldings) => currentHoldings.filter((currentHolding) => currentHolding._id !== holding._id));
      setHoldingPendingDelete(null);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to delete holding";
      setError(message);
      setDeleteModalError(message);
    } finally {
      setDeletingHoldingId("");
    }
  };

  useEffect(() => {
    if (!holdingPendingDelete) {
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
  }, [holdingPendingDelete, deletingHoldingId]);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Holdings</h2>
          <p className="mt-1 text-sm text-brand-muted">Track your instruments and goal-linked allocations.</p>
        </div>

        <Link
          to="/holdings/new"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Holding
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading holdings...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {!isLoading && !error && holdings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No holdings added yet
        </div>
      ) : null}

      {!isLoading && !error && holdings.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-line text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">Instrument</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Broker</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Quantity</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Current Price</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Current Value</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Linked Goal</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {holdings.map((holding) => {
                  const currentValue = Number(holding.quantity || 0) * Number(holding.currentPrice || 0);

                  return (
                    <tr key={holding._id}>
                      <td className="px-5 py-3 text-brand-text">{holding.instrumentName}</td>
                      <td className="px-5 py-3 text-brand-muted">{holding.broker}</td>
                      <td className="px-5 py-3 text-brand-muted">{holding.quantity}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.currentPrice)}</td>
                      <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(currentValue)}</td>
                      <td className="px-5 py-3 text-brand-muted">{holding.goalId?.name || "Unlinked"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/holdings/${holding._id}/edit`}
                            className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteHolding(holding)}
                            disabled={deletingHoldingId === holding._id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingHoldingId === holding._id ? "Deleting..." : "Delete"}
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

      {holdingPendingDelete ? (
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
            aria-labelledby="delete-holding-title"
            className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
          >
            <h3 id="delete-holding-title" className="text-lg font-semibold tracking-tight text-brand-text">Delete Holding</h3>
            <p className="mt-2 text-sm text-brand-muted">
              Are you sure you want to delete
              {" "}
              <span className="font-semibold text-brand-text">"{holdingPendingDelete.instrumentName}"</span>
              ?
              This action cannot be undone.
            </p>

            {deleteModalError ? <p className="mt-3 text-sm font-medium text-rose-600">{deleteModalError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingHoldingId === holdingPendingDelete._id}
                className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingHoldingId === holdingPendingDelete._id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingHoldingId === holdingPendingDelete._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default HoldingsPage;
