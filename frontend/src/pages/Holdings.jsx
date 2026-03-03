import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";

const DEFAULT_REFRESH_INTERVAL_MS = 60000;
const resolveRefreshIntervalMs = () => {
  const parsed = Number(import.meta.env.VITE_HOLDINGS_REFRESH_MS || DEFAULT_REFRESH_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFRESH_INTERVAL_MS;
};

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
  const [sortConfig, setSortConfig] = useState({
    key: "instrumentName",
    direction: "asc"
  });
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [instrumentTypeFilter, setInstrumentTypeFilter] = useState("all");
  const [linkedGoalFilter, setLinkedGoalFilter] = useState("all");
  const selectAllRef = useRef(null);

  const fetchPageData = async () => {
    const [holdingsResponse, goalsResponse] = await Promise.all([
      api.get("/holdings"),
      api.get("/goals")
    ]);

    setHoldings(holdingsResponse.data || []);
    setGoals(goalsResponse.data || []);
  };

  const refreshLivePrices = async () => {
    const holdingsResponse = await api.get("/holdings", { params: { livePrices: "true" } });
    setHoldings(holdingsResponse.data || []);
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        await fetchPageData();
        // Keep initial render fast; update to latest prices after holdings are already visible.
        void refreshLivePrices().catch(() => {
          // Ignore live price fetch failures on initial background refresh.
        });
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load holdings");
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, []);

  useEffect(() => {
    const refreshIntervalMs = resolveRefreshIntervalMs();
    const intervalId = window.setInterval(async () => {
      try {
        await refreshLivePrices();
      } catch (requestError) {
        // Keep existing data on intermittent quote-source failures.
      }
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const handlePortfolioRefreshed = (event) => {
      const nextHoldings = event.detail?.holdings;
      const nextGoals = event.detail?.goals;

      if (Array.isArray(nextHoldings)) {
        setHoldings(nextHoldings);
      }

      if (Array.isArray(nextGoals)) {
        setGoals(nextGoals);
      }
    };

    window.addEventListener("portfolio:refreshed", handlePortfolioRefreshed);

    return () => {
      window.removeEventListener("portfolio:refreshed", handlePortfolioRefreshed);
    };
  }, []);

  const brokerOptions = useMemo(() => (
    [...new Set(holdings.map((holding) => String(holding.broker || "").trim()).filter(Boolean))].sort((a, b) => (
      String(holdings.find((holding) => holding.broker === a)?.brokerDisplayName || a).localeCompare(
        String(holdings.find((holding) => holding.broker === b)?.brokerDisplayName || b),
        undefined,
        { sensitivity: "base" }
      )
    ))
  ), [holdings]);

  const filteredHoldings = useMemo(() => {
    return holdings.filter((holding) => {
      const holdingBroker = String(holding.broker || "").trim().toLowerCase();
      const holdingInstrumentType = String(holding.instrumentType || "").trim().toLowerCase();
      const holdingGoalId = holding.goalId?._id || "unlinked";

      const matchesBroker = brokerFilter === "all" || holdingBroker === brokerFilter.toLowerCase();
      const matchesInstrumentType = instrumentTypeFilter === "all"
        || holdingInstrumentType === instrumentTypeFilter.toLowerCase();
      const matchesGoal = linkedGoalFilter === "all"
        || (linkedGoalFilter === "linked" && holdingGoalId !== "unlinked")
        || (linkedGoalFilter === "unlinked" && holdingGoalId === "unlinked")
        || (linkedGoalFilter.startsWith("goal:") && holdingGoalId === linkedGoalFilter.replace("goal:", ""));

      return matchesBroker && matchesInstrumentType && matchesGoal;
    });
  }, [brokerFilter, holdings, instrumentTypeFilter, linkedGoalFilter]);

  const instrumentTypeOptions = useMemo(() => (
    [...new Set(holdings.map((holding) => String(holding.instrumentType || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  ), [holdings]);

  const linkedGoalOptions = useMemo(() => {
    const linkedGoalMap = new Map();

    holdings.forEach((holding) => {
      if (holding.goalId?._id && holding.goalId?.name) {
        linkedGoalMap.set(holding.goalId._id, holding.goalId.name);
      }
    });

    return [...linkedGoalMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [holdings]);

  useEffect(() => {
    const selectableHoldingIds = filteredHoldings.map((holding) => holding._id);
    const allSelected = selectableHoldingIds.length > 0 && selectableHoldingIds.every((holdingId) => selectedHoldingIds.includes(holdingId));
    const hasSelection = selectedHoldingIds.length > 0;

    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasSelection && !allSelected;
    }
  }, [filteredHoldings, selectedHoldingIds]);

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
    const selectableHoldingIds = filteredHoldings.map((holding) => holding._id);
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

  const sortedHoldings = useMemo(() => {
    const sorted = [...filteredHoldings];

    sorted.sort((left, right) => {
      const leftCurrentValue = Number(left.quantity || 0) * Number(left.currentPrice || 0);
      const rightCurrentValue = Number(right.quantity || 0) * Number(right.currentPrice || 0);
      const leftInvestedValue = Number(left.quantity || 0) * Number(left.averagePrice || 0);
      const rightInvestedValue = Number(right.quantity || 0) * Number(right.averagePrice || 0);
      const leftProfit = leftCurrentValue - leftInvestedValue;
      const rightProfit = rightCurrentValue - rightInvestedValue;
      const leftReturn = leftInvestedValue > 0 ? (leftProfit / leftInvestedValue) * 100 : 0;
      const rightReturn = rightInvestedValue > 0 ? (rightProfit / rightInvestedValue) * 100 : 0;

      const leftValueByKey = {
        instrumentName: left.instrumentName || "",
        instrumentType: left.instrumentType || "",
        broker: left.brokerDisplayName || left.broker || "",
        quantity: Number(left.quantity || 0),
        averagePrice: Number(left.averagePrice || 0),
        currentPrice: Number(left.currentPrice || 0),
        investedValue: leftInvestedValue,
        currentValue: leftCurrentValue,
        profit: leftProfit,
        returnPercent: leftReturn,
        linkedGoal: left.goalId?.name || ""
      }[sortConfig.key];

      const rightValueByKey = {
        instrumentName: right.instrumentName || "",
        instrumentType: right.instrumentType || "",
        broker: right.brokerDisplayName || right.broker || "",
        quantity: Number(right.quantity || 0),
        averagePrice: Number(right.averagePrice || 0),
        currentPrice: Number(right.currentPrice || 0),
        investedValue: rightInvestedValue,
        currentValue: rightCurrentValue,
        profit: rightProfit,
        returnPercent: rightReturn,
        linkedGoal: right.goalId?.name || ""
      }[sortConfig.key];

      if (typeof leftValueByKey === "string" || typeof rightValueByKey === "string") {
        return String(leftValueByKey).localeCompare(String(rightValueByKey), undefined, { sensitivity: "base" });
      }

      return Number(leftValueByKey || 0) - Number(rightValueByKey || 0);
    });

    return sortConfig.direction === "asc" ? sorted : sorted.reverse();
  }, [filteredHoldings, sortConfig.direction, sortConfig.key]);

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

  const selectedCount = selectedHoldingIds.length;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Holdings</h2>
          <p className="mt-1 text-sm text-brand-muted">Track your instruments and goal-linked allocations.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={brokerFilter}
            onChange={(event) => setBrokerFilter(event.target.value)}
            className="rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text focus:border-slate-400 focus:outline-none"
            aria-label="Filter holdings by broker"
          >
            <option value="all">All Brokers</option>
            {brokerOptions.map((brokerName) => (
              <option key={brokerName} value={brokerName}>
                {holdings.find((holding) => holding.broker === brokerName)?.brokerDisplayName || brokerName}
              </option>
            ))}
          </select>

          <select
            value={instrumentTypeFilter}
            onChange={(event) => setInstrumentTypeFilter(event.target.value)}
            className="rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text focus:border-slate-400 focus:outline-none"
            aria-label="Filter holdings by instrument type"
          >
            <option value="all">All Types</option>
            {instrumentTypeOptions.map((instrumentType) => (
              <option key={instrumentType} value={instrumentType}>
                {instrumentType}
              </option>
            ))}
          </select>

          <select
            value={linkedGoalFilter}
            onChange={(event) => setLinkedGoalFilter(event.target.value)}
            className="rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text focus:border-slate-400 focus:outline-none"
            aria-label="Filter holdings by linked goal"
          >
            <option value="all">ALL</option>
            <option value="linked">Linked Goals</option>
            <option value="unlinked">Unlinked Goals</option>
            {linkedGoalOptions.map((goal) => (
              <option key={goal.id} value={`goal:${goal.id}`}>
                {goal.name}
              </option>
            ))}
          </select>

          <Link
            to="/holdings/new"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Holding
          </Link>
        </div>
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
      {!isLoading && !error && filteredHoldings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No holdings found for selected filters
        </div>
      ) : null}

      {!isLoading && !error && filteredHoldings.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
          <div className="overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={filteredHoldings.length > 0 && filteredHoldings.every((holding) => selectedHoldingIds.includes(holding._id))}
                      onChange={handleSelectAll}
                      disabled={isBulkAssigning}
                      aria-label="Select all holdings"
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("instrumentName")} className="font-semibold">Instrument{getSortIndicator("instrumentName")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("broker")} className="font-semibold">Broker{getSortIndicator("broker")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("instrumentType")} className="font-semibold">Type{getSortIndicator("instrumentType")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("quantity")} className="font-semibold">Quantity{getSortIndicator("quantity")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("averagePrice")} className="font-semibold">Average Price{getSortIndicator("averagePrice")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("currentPrice")} className="font-semibold">Current Price{getSortIndicator("currentPrice")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("investedValue")} className="font-semibold">Invested Value{getSortIndicator("investedValue")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("currentValue")} className="font-semibold">Current Value{getSortIndicator("currentValue")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("profit")} className="font-semibold">Profit{getSortIndicator("profit")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("returnPercent")} className="font-semibold">Return %{getSortIndicator("returnPercent")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">
                    <button type="button" onClick={() => handleSort("linkedGoal")} className="font-semibold">Linked Goal{getSortIndicator("linkedGoal")}</button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {sortedHoldings.map((holding) => {
                  const investedValue = Number(holding.quantity || 0) * Number(holding.averagePrice || 0);
                  const currentValue = Number(holding.quantity || 0) * Number(holding.currentPrice || 0);
                  const profit = currentValue - investedValue;
                  const profitPercent = investedValue > 0 ? (profit / investedValue) * 100 : 0;
                  const profitClassName = profit >= 0 ? "text-emerald-600" : "text-rose-600";
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
                      <td className="px-5 py-3 text-brand-muted">{holding.brokerDisplayName || holding.broker}</td>
                      <td className="px-5 py-3 text-brand-muted">{holding.instrumentType}</td>
                      <td className="px-5 py-3 text-brand-muted">{holding.quantity}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.averagePrice)}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.currentPrice)}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(investedValue)}</td>
                      <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(currentValue)}</td>
                      <td className={`px-5 py-3 font-semibold ${profitClassName}`}>{formatCurrency(profit)}</td>
                      <td className={`px-5 py-3 font-semibold ${profitClassName}`}>{profitPercent.toFixed(2)}%</td>
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

