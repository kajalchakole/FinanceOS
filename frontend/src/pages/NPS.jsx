import React, { useEffect, useState } from "react";

import NpsModal from "../components/NpsModal";
import api from "../services/api";

const initialFormData = NpsModal.initialFormData;

function NPSPage() {
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
    const response = await api.get("/nps");
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    setAccounts(rows);
  };

  const fetchGoals = async () => {
    const response = await api.get("/goals");
    const rows = Array.isArray(response.data) ? response.data : [];
    setGoals(rows);
    const npsGoal = rows.find((goal) => goal.useNps);
    setSelectedGoalId(npsGoal?._id || "");
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchAccounts(), fetchGoals()]);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load NPS accounts");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSaveNpsGoalSelection = async () => {
    setError("");
    setSuccess("");
    setWarning("");
    setSavingGoalSelection(true);

    try {
      const currentNpsGoal = goals.find((goal) => goal.useNps);

      if (selectedGoalId) {
        await api.put(`/goals/${selectedGoalId}`, { useNps: true });
      } else if (currentNpsGoal?._id) {
        await api.put(`/goals/${currentNpsGoal._id}`, { useNps: false });
      }

      await fetchGoals();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      setSuccess("NPS goal selection updated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update NPS goal selection");
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
      annualExpectedReturnPct: account.annualExpectedReturnPct ?? 0,
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
      annualExpectedReturnPct: Number(formData.annualExpectedReturnPct || 0),
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
        await api.put(`/nps/${selectedAccountId}`, payload);
        setSuccess("NPS account updated");
      } else {
        await api.post("/nps", payload);
        setSuccess("NPS account created");
      }

      await fetchAccounts();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      closeModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save NPS account");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async (accountId) => {
    setError("");
    setSuccess("");
    setRecalculatingId(accountId);

    try {
      await api.post(`/nps/${accountId}/recalculate`);
      await fetchAccounts();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      setSuccess("NPS value recalculated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to recalculate NPS account");
    } finally {
      setRecalculatingId(null);
    }
  };

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;

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
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">NPS Tracking</h2>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          onClick={openAddModal}
        >
          Add NPS
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {warning ? <p className="mt-4 text-sm text-amber-600">{warning}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-500">{success}</p> : null}
      {loading ? <p className="mt-6 text-sm text-brand-muted">Loading...</p> : null}

      {!loading ? (
        <div className="mt-6 rounded-2xl border border-brand-line bg-white p-5">
          <h3 className="text-base font-semibold text-brand-text">NPS Goal Assignment</h3>
          <p className="mt-1 text-sm text-brand-muted">Select one goal to receive full NPS corpus.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedGoalId}
              onChange={(event) => setSelectedGoalId(event.target.value)}
              disabled={goals.length === 0 || savingGoalSelection}
              className="w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="">Do not link NPS to any goal</option>
              {goals.map((goal) => (
                <option key={goal._id} value={goal._id}>{goal.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveNpsGoalSelection}
              disabled={goals.length === 0 || savingGoalSelection}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingGoalSelection ? "Saving..." : "Save Goal"}
            </button>
          </div>
          {goals.length === 0 ? (
            <p className="mt-2 text-xs text-brand-muted">Create a goal first to link NPS.</p>
          ) : null}
        </div>
      ) : null}

      {!loading ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-brand-line text-left text-brand-muted">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Opening Balance</th>
                <th className="px-3 py-2">Monthly Contribution</th>
                <th className="px-3 py-2">Expected Return %</th>
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
                  <td className="px-3 py-3">{Number(account.annualExpectedReturnPct || 0).toFixed(2)}%</td>
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

      <NpsModal
        show={showModal}
        isEditMode={isEditMode}
        formData={formData}
        saving={saving}
        onChange={handleInputChange}
        onSubmit={handleSave}
        onClose={closeModal}
      />
    </section>
  );
}

export default NPSPage;
