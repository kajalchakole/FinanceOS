import React, { useEffect, useState } from "react";

import api from "../services/api";

const initialFormData = {
  name: "",
  openingBalance: "",
  openingBalanceAsOf: "",
  monthlyContribution: "",
  annualInterestRatePct: "",
  isActive: true
};

function EPFPage() {
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoalSelection, setSavingGoalSelection] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");

  const fetchAccounts = async () => {
    const response = await api.get("/epf");
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    setAccounts(rows);
  };

  const fetchGoals = async () => {
    const response = await api.get("/goals");
    const rows = Array.isArray(response.data) ? response.data : [];
    setGoals(rows);
    const epfGoal = rows.find((goal) => goal.useEpf);
    setSelectedGoalId(epfGoal?._id || "");
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchAccounts(), fetchGoals()]);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load EPF accounts");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSaveEpfGoalSelection = async () => {
    setError("");
    setSuccess("");
    setWarning("");
    setSavingGoalSelection(true);

    try {
      const currentEpfGoal = goals.find((goal) => goal.useEpf);

      if (selectedGoalId) {
        await api.put(`/goals/${selectedGoalId}`, { useEpf: true });
      } else if (currentEpfGoal?._id) {
        await api.put(`/goals/${currentEpfGoal._id}`, { useEpf: false });
      }

      await fetchGoals();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      setSuccess("EPF goal selection updated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update EPF goal selection");
    } finally {
      setSavingGoalSelection(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setSelectedAccountId(null);
    setFormData(initialFormData);
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setWarning("");
    setFormData(initialFormData);
    setIsEditMode(false);
    setSelectedAccountId(null);
    setShowModal(true);
  };

  const openEditModal = (account) => {
    setError("");
    setSuccess("");
    setWarning("");
    setIsEditMode(true);
    setSelectedAccountId(account._id);
    setFormData({
      name: account.name || "",
      openingBalance: account.openingBalance ?? "",
      openingBalanceAsOf: account.openingBalanceAsOf ? account.openingBalanceAsOf.slice(0, 10) : "",
      monthlyContribution: account.monthlyContribution ?? 0,
      annualInterestRatePct: account.annualInterestRatePct ?? 0,
      isActive: account.isActive !== false
    });
    setShowModal(true);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setWarning("");

    if (!formData.name || !formData.openingBalanceAsOf) {
      setError("name and opening balance as-of date are required");
      return;
    }

    const payload = {
      name: formData.name,
      openingBalance: Number(formData.openingBalance),
      openingBalanceAsOf: formData.openingBalanceAsOf,
      monthlyContribution: Number(formData.monthlyContribution || 0),
      annualInterestRatePct: Number(formData.annualInterestRatePct || 0),
      isActive: Boolean(formData.isActive)
    };

    if (!Number.isFinite(payload.openingBalance) || payload.openingBalance < 0) {
      setError("opening balance must be a non-negative number");
      return;
    }

    const asOfDate = new Date(payload.openingBalanceAsOf);
    if (Number.isNaN(asOfDate.getTime())) {
      setError("opening balance as-of must be a valid date");
      return;
    }

    if (asOfDate > new Date()) {
      setWarning("Opening balance date is in the future; months will be treated as zero.");
    }

    setSaving(true);

    try {
      if (isEditMode && selectedAccountId) {
        await api.put(`/epf/${selectedAccountId}`, payload);
        setSuccess("EPF account updated");
      } else {
        await api.post("/epf", payload);
        setSuccess("EPF account created");
      }

      await fetchAccounts();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      closeModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save EPF account");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async (accountId) => {
    setError("");
    setSuccess("");
    setRecalculatingId(accountId);

    try {
      await api.post(`/epf/${accountId}/recalculate`);
      await fetchAccounts();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      setSuccess("EPF value recalculated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to recalculate EPF account");
    } finally {
      setRecalculatingId(null);
    }
  };

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDateTime = (value) => (value
    ? new Date(value).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
    : "-");

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">EPF Tracking</h2>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          onClick={openAddModal}
        >
          Add EPF
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {warning ? <p className="mt-4 text-sm text-amber-600">{warning}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-500">{success}</p> : null}

      {loading ? <p className="mt-6 text-sm text-brand-muted">Loading...</p> : null}

      {!loading ? (
        <div className="mt-6 rounded-2xl border border-brand-line bg-white p-5">
          <h3 className="text-base font-semibold text-brand-text">EPF Goal Assignment</h3>
          <p className="mt-1 text-sm text-brand-muted">Select one goal to receive full EPF corpus.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedGoalId}
              onChange={(event) => setSelectedGoalId(event.target.value)}
              disabled={goals.length === 0 || savingGoalSelection}
              className="w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Do not link EPF to any goal</option>
              {goals.map((goal) => (
                <option key={goal._id} value={goal._id}>{goal.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveEpfGoalSelection}
              disabled={goals.length === 0 || savingGoalSelection}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingGoalSelection ? "Saving..." : "Save Goal"}
            </button>
          </div>
          {goals.length === 0 ? (
            <p className="mt-2 text-xs text-brand-muted">Create a goal first to link EPF.</p>
          ) : null}
        </div>
      ) : null}

      {!loading ? (
        <div className="mt-6 overflow-x-auto">
          <table className="fo-table">
            <thead>
              <tr className="border-b border-brand-line text-left text-brand-muted">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Opening Balance</th>
                <th className="px-3 py-2">Monthly Contribution</th>
                <th className="px-3 py-2">Interest %</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Cached Current Value</th>
                <th className="px-3 py-2">Last Refreshed</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account._id} className="border-b border-brand-line/60 text-brand-text">
                  <td className="px-3 py-3">{account.name}</td>
                  <td className="px-3 py-3">{formatCurrency(account.openingBalance)}</td>
                  <td className="px-3 py-3">{formatCurrency(account.monthlyContribution)}</td>
                  <td className="px-3 py-3">{Number(account.annualInterestRatePct || 0).toFixed(2)}%</td>
                  <td className="px-3 py-3">{account.isActive === false ? "Inactive" : "Active"}</td>
                  <td className="px-3 py-3">{formatCurrency(account.cachedValue)}</td>
                  <td className="px-3 py-3">{formatDateTime(account.cachedAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-brand-line px-3 py-1 text-xs"
                        onClick={() => openEditModal(account)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-brand-line px-3 py-1 text-xs"
                        disabled={recalculatingId === account._id}
                        onClick={() => handleRecalculate(account._id)}
                      >
                        {recalculatingId === account._id ? "Recalculating..." : "Recalculate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-brand-text">{isEditMode ? "Edit EPF" : "Add EPF"}</h3>
            <form className="mt-4 space-y-4" onSubmit={handleSave}>
              <label className="block space-y-1 text-sm text-brand-text">
                <span className="font-medium">Name</span>
                <input
                  className="w-full rounded-xl border border-brand-line px-3 py-2"
                  name="name"
                  placeholder="e.g. EPF Primary"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block space-y-1 text-sm text-brand-text">
                <span className="font-medium">Opening Balance</span>
                <input
                  className="w-full rounded-xl border border-brand-line px-3 py-2"
                  name="openingBalance"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formData.openingBalance}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block space-y-1 text-sm text-brand-text">
                <span className="font-medium">Opening Balance As Of</span>
                <input
                  className="w-full rounded-xl border border-brand-line px-3 py-2"
                  name="openingBalanceAsOf"
                  type="date"
                  value={formData.openingBalanceAsOf}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block space-y-1 text-sm text-brand-text">
                <span className="font-medium">Monthly Contribution</span>
                <input
                  className="w-full rounded-xl border border-brand-line px-3 py-2"
                  name="monthlyContribution"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={formData.monthlyContribution}
                  onChange={handleInputChange}
                />
              </label>
              <label className="block space-y-1 text-sm text-brand-text">
                <span className="font-medium">Annual Interest Rate (%)</span>
                <input
                  className="w-full rounded-xl border border-brand-line px-3 py-2"
                  name="annualInterestRatePct"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={formData.annualInterestRatePct}
                  onChange={handleInputChange}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-brand-text">
                <input name="isActive" type="checkbox" checked={formData.isActive} onChange={handleInputChange} />
                Active
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm" onClick={closeModal}>Cancel</button>
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default EPFPage;

