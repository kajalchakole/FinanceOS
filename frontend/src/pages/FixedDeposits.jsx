import React, { useEffect, useState } from "react";

import api from "../services/api";

const initialFormData = {
  bank: "",
  fdName: "",
  principal: "",
  interestRate: "",
  startDate: "",
  maturityDate: "",
  compounding: "annual",
  isAutoRenew: false,
  goalId: "",
  notes: ""
};

function FixedDepositsPage() {
  const [fixedDeposits, setFixedDeposits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [totalFDValue, setTotalFDValue] = useState(0);
  const [lastCalculatedAt, setLastCalculatedAt] = useState(null);
  const [intervalDays, setIntervalDays] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFD, setSelectedFD] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [editData, setEditData] = useState({
    interestRate: "",
    maturityDate: "",
    isAutoRenew: false,
    goalId: "",
    notes: "",
    compounding: "annual"
  });

  const normalizeFixedDeposits = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.fixedDeposits)) {
      return payload.fixedDeposits;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    return [];
  };

  const fetchFixedDeposits = async () => {
    const response = await api.get("/fixed-deposits");
    const fds = normalizeFixedDeposits(response.data).sort(
      (a, b) => new Date(a.maturityDate) - new Date(b.maturityDate)
    );
    const total = fds.reduce((sum, fd) => sum + Number(fd.cachedValue || 0), 0);
    const latestTimestamp = fds.reduce((latest, fd) => {
      const timestamp = fd?.lastCalculatedAt ? new Date(fd.lastCalculatedAt).getTime() : NaN;

      if (!Number.isFinite(timestamp)) {
        return latest;
      }

      return timestamp > latest ? timestamp : latest;
    }, Number.NEGATIVE_INFINITY);

    setFixedDeposits(fds);
    setTotalFDValue(total);
    setLastCalculatedAt(Number.isFinite(latestTimestamp) ? new Date(latestTimestamp) : null);
  };

  const fetchGoals = async () => {
    const response = await api.get("/goals");
    setGoals(Array.isArray(response.data) ? response.data : []);
  };

  const fetchSettings = async () => {
    const response = await api.get("/settings");
    const settingsInterval = Number(response.data?.fdRecalculationIntervalDays);
    setIntervalDays(Number.isFinite(settingsInterval) ? settingsInterval : null);
  };

  useEffect(() => {
    const loadFixedDeposits = async () => {
      try {
        setError("");
        await Promise.all([fetchFixedDeposits(), fetchGoals(), fetchSettings()]);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load fixed deposits");
      } finally {
        setIsLoading(false);
      }
    };

    loadFixedDeposits();
  }, []);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData(initialFormData);
    setError("");
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedFD(null);
    setEditData({
      interestRate: "",
      maturityDate: "",
      isAutoRenew: false,
      goalId: "",
      notes: "",
      compounding: "annual"
    });
  };

  const handleEditOpen = (fd) => {
    const normalizedGoalId = typeof fd.goalId === "object" ? fd.goalId?._id || "" : fd.goalId || "";

    setSelectedFD(fd);
    setEditData({
      interestRate: fd.interestRate ?? "",
      maturityDate: fd.maturityDate ? fd.maturityDate.slice(0, 10) : "",
      isAutoRenew: Boolean(fd.isAutoRenew),
      goalId: normalizedGoalId,
      notes: fd.notes || "",
      compounding: fd.compounding || "annual"
    });
    setShowEditModal(true);
    setSuccessMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setError("");

    if (!formData.bank || !formData.fdName || !formData.principal || !formData.interestRate || !formData.startDate || !formData.maturityDate) {
      setError("Please fill all required fields.");
      return;
    }

    const tenureInDays = (
      (new Date(formData.maturityDate) - new Date(formData.startDate))
      / (1000 * 60 * 60 * 24)
    );

    if (!Number.isFinite(tenureInDays) || tenureInDays <= 0) {
      setError("Maturity date must be after start date.");
      return;
    }

    setIsSaving(true);

    try {
      await api.post("/fixed-deposits", {
        bank: formData.bank,
        fdName: formData.fdName,
        principal: Number(formData.principal),
        interestRate: Number(formData.interestRate),
        startDate: formData.startDate,
        maturityDate: formData.maturityDate,
        tenureInDays,
        compounding: formData.compounding,
        isAutoRenew: formData.isAutoRenew,
        goalId: formData.goalId || null,
        notes: formData.notes
      });

      await fetchFixedDeposits();
      setShowForm(false);
      setFormData(initialFormData);
      setSuccessMessage("Fixed deposit created successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create fixed deposit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setError("");

    if (!selectedFD?._id) {
      setError("No fixed deposit selected.");
      return;
    }

    if (!editData.interestRate || !editData.maturityDate) {
      setError("Please fill all required edit fields.");
      return;
    }

    setIsUpdating(true);

    try {
      await api.patch(`/fixed-deposits/${selectedFD._id}`, {
        interestRate: Number(editData.interestRate),
        maturityDate: editData.maturityDate,
        isAutoRenew: editData.isAutoRenew,
        goalId: editData.goalId || null,
        notes: editData.notes,
        compounding: editData.compounding
      });

      closeEditModal();
      await fetchFixedDeposits();
      setSuccessMessage("Fixed deposit updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update fixed deposit");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecalculateAll = async () => {
    setSuccessMessage("");
    setError("");
    setRecalculating(true);

    try {
      await api.post("/fixed-deposits/recalculate");
      await fetchFixedDeposits();
      setSuccessMessage("Fixed deposits recalculated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to recalculate fixed deposits");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteFD = async (fdId) => {
    if (!fdId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this fixed deposit?");

    if (!shouldDelete) {
      return;
    }

    setSuccessMessage("");
    setError("");
    setDeletingId(fdId);

    try {
      await api.delete(`/fixed-deposits/${fdId}`);
      await fetchFixedDeposits();
      setSuccessMessage("Fixed deposit deleted successfully.");

      if (selectedFD?._id === fdId) {
        closeEditModal();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete fixed deposit");
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  const formatLastCalculated = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getMaturityValueDisplay = (fd) => {
    if (fd.status === "matured") {
      return Number(fd.cachedValue || 0);
    }

    if (fd.maturityAmount !== undefined && fd.maturityAmount !== null) {
      return Number(fd.maturityAmount || 0);
    }

    const estimated = Number(fd.principal || 0) * Math.pow(
      1 + (Number(fd.interestRate || 0) / 100),
      Number(fd.tenureInDays || 0) / 365
    );

    return Number.isFinite(estimated) ? estimated : 0;
  };

  const isMaturingSoon = (maturityDate) => {
    const today = new Date();
    const maturity = new Date(maturityDate);
    const diffInMs = maturity - today;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    return diffInDays >= 0 && diffInDays <= 30;
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Fixed Deposits</h2>
          <p className="mt-1 text-sm text-brand-muted">Track your fixed deposit accounts and maturity timelines.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setSuccessMessage("");
            setError("");
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Add FD
        </button>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {showForm ? (
        <article className="rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-brand-text">Add Fixed Deposit</h3>
          <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2 text-sm text-brand-text">
                <span>Bank *</span>
                <input name="bank" value={formData.bank} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>FD Name *</span>
                <input name="fdName" value={formData.fdName} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Principal *</span>
                <input type="number" min="0" step="0.01" name="principal" value={formData.principal} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Interest Rate (%) *</span>
                <input type="number" min="0" step="0.01" name="interestRate" value={formData.interestRate} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Start Date *</span>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Maturity Date *</span>
                <input type="date" name="maturityDate" value={formData.maturityDate} onChange={handleInputChange} required className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Compounding</span>
                <select name="compounding" value={formData.compounding} onChange={handleInputChange} className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400">
                  <option value="annual">annual</option>
                  <option value="quarterly">quarterly</option>
                  <option value="monthly">monthly</option>
                </select>
              </label>
              <label className="mt-8 flex items-center gap-2 text-sm text-brand-text">
                <input type="checkbox" name="isAutoRenew" checked={formData.isAutoRenew} onChange={handleInputChange} className="h-4 w-4 rounded border-brand-line" />
                <span>Auto Renew</span>
              </label>
              <label className="space-y-2 text-sm text-brand-text">
                <span>Link to Goal (Optional)</span>
                <select
                  name="goalId"
                  value={formData.goalId}
                  onChange={(event) => setFormData({ ...formData, goalId: event.target.value })}
                  className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                >
                  <option value="">Unassigned</option>
                  {goals.map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm text-brand-text">
              <span>Notes</span>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400" />
            </label>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSaving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                {isSaving ? "Creating..." : "Create FD"}
              </button>
              <button type="button" onClick={handleCancel} className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="rounded-2xl border border-brand-line bg-brand-panel p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-sm text-brand-muted">
            <p><span className="font-semibold text-brand-text">Total Value:</span> {formatCurrency(totalFDValue)}</p>
            <p><span className="font-semibold text-brand-text">Last Calculated:</span> {formatLastCalculated(lastCalculatedAt)}</p>
            <p><span className="font-semibold text-brand-text">Refresh Interval:</span> {intervalDays ?? "-"} day(s)</p>
          </div>
          <button
            type="button"
            onClick={handleRecalculateAll}
            disabled={recalculating || isLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {recalculating ? "Recalculating..." : "Recalculate All"}
          </button>
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
        <div className="border-b border-brand-line px-5 py-4">
          <h3 className="text-lg font-semibold tracking-tight text-brand-text">Fixed Deposit List</h3>
        </div>

        {isLoading ? <p className="px-5 py-4 text-sm text-brand-muted">Loading fixed deposits...</p> : null}

        {!isLoading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-line text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">Bank</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">FD Name</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Principal</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Interest Rate</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Start Date</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Maturity Date</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Maturity Value</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Compounding</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Auto Renew</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {fixedDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-6 text-center text-sm text-brand-muted">
                      No fixed deposits found.
                    </td>
                  </tr>
                ) : fixedDeposits.map((deposit) => (
                  <tr
                    key={deposit._id}
                    className={isMaturingSoon(deposit.maturityDate) && deposit.status === "active" ? "bg-yellow-50 border-l-4 border-yellow-400" : ""}
                  >
                    <td className="px-5 py-3 text-brand-text">{deposit.bank}</td>
                    <td className="px-5 py-3 text-brand-text">{deposit.fdName}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatCurrency(deposit.principal)}</td>
                    <td className="px-5 py-3 text-brand-muted">{Number(deposit.interestRate || 0).toFixed(2)}%</td>
                    <td className="px-5 py-3 text-brand-muted">{deposit.startDate?.slice(0, 10)}</td>
                    <td className="px-5 py-3 text-brand-muted">
                      {deposit.maturityDate?.slice(0, 10)}
                      {isMaturingSoon(deposit.maturityDate) && deposit.status === "active" ? (
                        <span className="ml-2 text-xs font-medium text-yellow-700">
                          Maturing Soon
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-brand-muted">{formatCurrency(getMaturityValueDisplay(deposit))}</td>
                    <td className="px-5 py-3 text-brand-muted capitalize">{deposit.compounding}</td>
                    <td className="px-5 py-3 text-brand-muted">{deposit.isAutoRenew ? "Yes" : "No"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditOpen(deposit)}
                        className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFD(deposit._id)}
                        disabled={deletingId === deposit._id}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === deposit._id ? "Deleting..." : "Delete"}
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      {showEditModal && selectedFD ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeEditModal}
        >
          <article
            className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-text">Edit Fixed Deposit</h3>
            <form className="mt-5 space-y-5" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Principal</span>
                  <input
                    value={selectedFD.principal ?? ""}
                    disabled
                    className="w-full rounded-xl border border-brand-line bg-slate-100 px-3 py-2 text-sm text-brand-muted outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Start Date</span>
                  <input
                    value={selectedFD.startDate ? selectedFD.startDate.slice(0, 10) : ""}
                    disabled
                    className="w-full rounded-xl border border-brand-line bg-slate-100 px-3 py-2 text-sm text-brand-muted outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Cached Value</span>
                  <input
                    value={formatCurrency(selectedFD.cachedValue)}
                    disabled
                    className="w-full rounded-xl border border-brand-line bg-slate-100 px-3 py-2 text-sm text-brand-muted outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Interest Rate (%) *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.interestRate}
                    onChange={(event) => setEditData({ ...editData, interestRate: event.target.value })}
                    required
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Compounding</span>
                  <select
                    value={editData.compounding}
                    onChange={(event) => setEditData({ ...editData, compounding: event.target.value })}
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                  >
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Maturity Date *</span>
                  <input
                    type="date"
                    value={editData.maturityDate}
                    onChange={(event) => setEditData({ ...editData, maturityDate: event.target.value })}
                    required
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                  />
                </label>
                <label className="mt-8 flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    checked={editData.isAutoRenew}
                    onChange={(event) => setEditData({ ...editData, isAutoRenew: event.target.checked })}
                    className="h-4 w-4 rounded border-brand-line"
                  />
                  <span>Auto Renew</span>
                </label>
                <label className="space-y-2 text-sm text-brand-text">
                  <span>Link to Goal (Optional)</span>
                  <select
                    value={editData.goalId}
                    onChange={(event) => setEditData({ ...editData, goalId: event.target.value })}
                    className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                  >
                    <option value="">Unassigned</option>
                    {goals.map((goal) => (
                      <option key={goal._id} value={goal._id}>
                        {goal.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2 text-sm text-brand-text">
                <span>Notes</span>
                <textarea
                  value={editData.notes}
                  onChange={(event) => setEditData({ ...editData, notes: event.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isUpdating ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}

export default FixedDepositsPage;
