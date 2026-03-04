import React, { useEffect, useMemo, useState } from "react";

import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";

const initialFormData = {
  name: "",
  bank: "",
  balance: "",
  interestRate: "",
  goalId: ""
};

const toFormData = (account) => ({
  name: account?.name || "",
  bank: account?.bank || "",
  balance: account?.balance ?? "",
  interestRate: account?.interestRate ?? "",
  goalId: account?.goalId?._id || account?.goalId || ""
});

function CashAccountsPage() {
  const [cashAccounts, setCashAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingAccountId, setDeletingAccountId] = useState("");

  const fetchData = async () => {
    const [accountsResponse, goalsResponse] = await Promise.all([
      api.get("/cash-accounts"),
      api.get("/goals")
    ]);

    setCashAccounts(accountsResponse.data || []);
    setGoals(goalsResponse.data || []);
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        setError("");
        await fetchData();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load cash accounts");
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, []);

  const refreshDashboard = () => {
    window.dispatchEvent(new CustomEvent("dashboard:refresh"));
  };

  const sortedCashAccounts = useMemo(() => {
    return [...cashAccounts].sort((left, right) => {
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    });
  }, [cashAccounts]);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return `${Number(value || 0).toFixed(2)}%`;
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const openCreateModal = () => {
    setError("");
    setEditingAccountId("");
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setError("");
    setEditingAccountId(account._id);
    setFormData(toFormData(account));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingAccountId("");
    setFormData(initialFormData);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    setError("");

    if (!String(formData.name || "").trim()) {
      setError("Name is required.");
      return;
    }

    if (!String(formData.bank || "").trim()) {
      setError("Bank is required.");
      return;
    }

    const balance = Number(formData.balance);
    if (!Number.isFinite(balance)) {
      setError("Balance must be a valid number.");
      return;
    }

    let interestRate = null;
    if (formData.interestRate !== "" && formData.interestRate !== null && formData.interestRate !== undefined) {
      interestRate = Number(formData.interestRate);

      if (!Number.isFinite(interestRate)) {
        setError("Interest rate must be a valid number.");
        return;
      }
    }

    const payload = {
      name: formData.name,
      bank: formData.bank,
      balance,
      interestRate,
      goalId: formData.goalId || null
    };

    setIsSaving(true);

    try {
      if (editingAccountId) {
        await api.put(`/cash-accounts/${editingAccountId}`, payload);
      } else {
        await api.post("/cash-accounts", payload);
      }

      await fetchData();
      closeModal();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save cash account");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (account) => {
    setError("");
    setDeleteTarget(account);
  };

  const closeDeleteModal = () => {
    if (deletingAccountId) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) {
      return;
    }

    setError("");
    setDeletingAccountId(deleteTarget._id);

    try {
      await api.delete(`/cash-accounts/${deleteTarget._id}`);
      setDeleteTarget(null);
      await fetchData();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete cash account");
    } finally {
      setDeletingAccountId("");
    }
  };

  return (
    <section className="space-y-8 lg:w-fit lg:max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Cash Accounts</h2>
          <p className="mt-1 text-sm text-brand-muted">Track savings accounts manually and optionally link them to goals.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Cash Account
        </button>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading cash accounts...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && !error && sortedCashAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No cash accounts found.
        </div>
      ) : null}

      {!isLoading && sortedCashAccounts.length > 0 ? (
        <div className="w-full overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft lg:w-fit lg:max-w-full">
          <div className="overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">Name</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Bank</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Balance</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Interest Rate</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Linked Goal</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Last Updated</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {sortedCashAccounts.map((account) => (
                  <tr key={account._id}>
                    <td className="px-5 py-3 text-brand-text">{account.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{account.bank}</td>
                    <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(account.balance)}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatPercent(account.interestRate)}</td>
                    <td className="px-5 py-3 text-brand-muted">{account.goalId?.name || "Unlinked"}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatDate(account.lastUpdatedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(account)}
                          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(account)}
                          disabled={deletingAccountId === account._id}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingAccountId === account._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-brand-line bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-brand-text">{editingAccountId ? "Edit Cash Account" : "Add Cash Account"}</h3>
            <p className="mt-1 text-sm text-brand-muted">Manual entry only. Savings account balances contribute to portfolio and goals.</p>

            <form className="mt-5 space-y-4" onSubmit={handleSaveAccount}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-brand-text">
                  Name
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-brand-text">
                  Bank
                  <input
                    name="bank"
                    value={formData.bank}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-brand-text">
                  Balance
                  <input
                    name="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-brand-text">
                  Interest Rate (optional)
                  <input
                    name="interestRate"
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-brand-text">
                Linked Goal
                <select
                  name="goalId"
                  value={formData.goalId}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Unlinked</option>
                  {goals.map((goal) => (
                    <option key={goal._id} value={goal._id}>{goal.name}</option>
                  ))}
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-brand-line px-4 py-2 text-sm font-medium text-brand-text transition hover:bg-slate-50"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingAccountId ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Cash Account"
        message={deleteTarget
          ? `Are you sure you want to delete "${deleteTarget.name}"?`
          : ""}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={Boolean(deleteTarget && deletingAccountId === deleteTarget._id)}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
        ariaLabelledBy="delete-cash-account-title"
      />
    </section>
  );
}

export default CashAccountsPage;
