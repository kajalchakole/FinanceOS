import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";

function HoldingsPage() {
  const [holdings, setHoldings] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingHoldingId, setDeletingHoldingId] = useState("");
  const [holdingPendingDelete, setHoldingPendingDelete] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState("");
  const [selectedHoldingIds, setSelectedHoldingIds] = useState([]);
  const [bulkGoalSelection, setBulkGoalSelection] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkActionError, setBulkActionError] = useState("");
  const [bulkAssignmentPending, setBulkAssignmentPending] = useState(null);
  const selectAllRef = useRef(null);

  const fetchPageData = async () => {
    const [holdingsResponse, goalsResponse] = await Promise.all([
      api.get("/holdings"),
      api.get("/goals")
    ]);

    setHoldings(holdingsResponse.data || []);
    setGoals(goalsResponse.data || []);
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        await fetchPageData();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load holdings");
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, []);

  useEffect(() => {
    const selectableHoldingIds = holdings.map((holding) => holding._id);
    const allSelected = selectableHoldingIds.length > 0 && selectableHoldingIds.every((holdingId) => selectedHoldingIds.includes(holdingId));
    const hasSelection = selectedHoldingIds.length > 0;

    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasSelection && !allSelected;
    }
  }, [holdings, selectedHoldingIds]);

  const refreshDashboard = () => {
    window.dispatchEvent(new CustomEvent("dashboard:refresh"));
  };

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
      setSelectedHoldingIds((currentIds) => currentIds.filter((holdingId) => holdingId !== holding._id));
      setHoldingPendingDelete(null);
      refreshDashboard();
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to delete holding";
      setError(message);
      setDeleteModalError(message);
    } finally {
      setDeletingHoldingId("");
    }
  };

  const handleHoldingSelection = (holdingId) => {
    setBulkActionError("");
    setBulkGoalSelection("");
    setSelectedHoldingIds((currentIds) => {
      if (currentIds.includes(holdingId)) {
        return currentIds.filter((id) => id !== holdingId);
      }

      return [...currentIds, holdingId];
    });
  };

  const handleSelectAll = () => {
    const selectableHoldingIds = holdings.map((holding) => holding._id);
    const allSelected = selectableHoldingIds.length > 0 && selectableHoldingIds.every((holdingId) => selectedHoldingIds.includes(holdingId));

    setBulkActionError("");
    setBulkGoalSelection("");
    setSelectedHoldingIds(allSelected ? [] : selectableHoldingIds);
  };

  const handleBulkGoalChange = (event) => {
    const value = event.target.value;
    setBulkGoalSelection(value);
    setBulkActionError("");
  };

  const handleApplyBulkAssignment = async () => {
    if (selectedHoldingIds.length === 0) {
      setBulkActionError("Please select at least one holding.");
      return;
    }

    if (!bulkGoalSelection) {
      setBulkActionError("Please choose a goal or Unassigned.");
      return;
    }

    const selectedGoalName = bulkGoalSelection === "unassigned"
      ? "Unassigned"
      : goals.find((goal) => goal._id === bulkGoalSelection)?.name || "selected goal";

    setBulkAssignmentPending({
      holdingIds: [...selectedHoldingIds],
      goalId: bulkGoalSelection === "unassigned" ? null : bulkGoalSelection,
      goalName: selectedGoalName
    });
  };

  const closeBulkAssignModal = () => {
    if (isBulkAssigning) {
      return;
    }

    setBulkAssignmentPending(null);
  };

  const handleConfirmBulkAssignment = async () => {
    if (!bulkAssignmentPending) {
      return;
    }

    setError("");
    setIsBulkAssigning(true);

    try {
      await api.patch("/holdings/bulk-assign", {
        holdingIds: bulkAssignmentPending.holdingIds,
        goalId: bulkAssignmentPending.goalId
      });

      setSelectedHoldingIds([]);
      setBulkGoalSelection("");
      setBulkAssignmentPending(null);
      await fetchPageData();
      refreshDashboard();
    } catch (requestError) {
      setBulkActionError(requestError.response?.data?.message || "Unable to update holdings");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  const selectedCount = selectedHoldingIds.length;

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

      {selectedCount > 0 ? (
        <div className="rounded-2xl border border-brand-line bg-brand-panel p-4 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-brand-text">
              {selectedCount}
              {" "}
              holding
              {selectedCount > 1 ? "s" : ""}
              {" "}
              selected
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={bulkGoalSelection}
                onChange={handleBulkGoalChange}
                disabled={isBulkAssigning}
                className="rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text focus:border-slate-400 focus:outline-none"
              >
                <option value="">Assign selected to...</option>
                <option value="unassigned">Unassigned</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>{goal.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApplyBulkAssignment}
                disabled={isBulkAssigning || !bulkGoalSelection}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkAssigning ? "Applying..." : "Apply"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHoldingIds([]);
                  setBulkGoalSelection("");
                  setBulkActionError("");
                }}
                disabled={isBulkAssigning}
                className="rounded-xl border border-brand-line px-3 py-2 text-sm font-semibold text-brand-muted transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </div>

          {bulkActionError ? <p className="mt-3 text-sm font-medium text-rose-600">{bulkActionError}</p> : null}
        </div>
      ) : null}

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
                  <th className="px-5 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={holdings.length > 0 && holdings.every((holding) => selectedHoldingIds.includes(holding._id))}
                      onChange={handleSelectAll}
                      disabled={isBulkAssigning}
                      aria-label="Select all holdings"
                    />
                  </th>
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
                  const isSelected = selectedHoldingIds.includes(holding._id);

                  return (
                    <tr key={holding._id}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleHoldingSelection(holding._id)}
                          disabled={isBulkAssigning}
                          aria-label={`Select ${holding.instrumentName}`}
                        />
                      </td>
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
                            disabled={deletingHoldingId === holding._id || isBulkAssigning}
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

      <ConfirmationModal
        isOpen={Boolean(holdingPendingDelete)}
        title="Delete Holding"
        message={holdingPendingDelete
          ? `Are you sure you want to delete "${holdingPendingDelete.instrumentName}"? This action cannot be undone.`
          : ""}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={Boolean(holdingPendingDelete && deletingHoldingId === holdingPendingDelete._id)}
        errorMessage={deleteModalError}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        ariaLabelledBy="delete-holding-title"
      />

      <ConfirmationModal
        isOpen={Boolean(bulkAssignmentPending)}
        title="Confirm Assignment"
        message={bulkAssignmentPending
          ? `Assign ${bulkAssignmentPending.holdingIds.length} selected holding(s) to "${bulkAssignmentPending.goalName}"?`
          : ""}
        confirmLabel="Confirm"
        variant="primary"
        isProcessing={isBulkAssigning}
        onCancel={closeBulkAssignModal}
        onConfirm={handleConfirmBulkAssignment}
        ariaLabelledBy="bulk-assign-title"
      />
    </section>
  );
}

export default HoldingsPage;
