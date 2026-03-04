import React, { useEffect, useMemo, useState } from "react";

import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";

const liabilityTypes = ["Home Loan", "Plot Loan", "Car Loan", "Other"];
const interestModes = [
  { value: "reducing", label: "Reducing Balance" },
  { value: "flat", label: "Flat Rate" }
];

const initialFormData = {
  name: "",
  type: "Home Loan",
  principalAmount: "",
  interestRateAnnual: "",
  emiAmount: "",
  startDate: "",
  tenureMonths: "",
  interestCalculationType: "reducing",
  manualOutstandingOverride: "",
  notes: ""
};

const toFormData = (liability) => ({
  name: liability?.name || "",
  type: liability?.type || "Home Loan",
  principalAmount: liability?.principalAmount ?? "",
  interestRateAnnual: liability?.interestRateAnnual ?? "",
  emiAmount: liability?.emiAmount ?? "",
  startDate: liability?.startDate ? new Date(liability.startDate).toISOString().slice(0, 10) : "",
  tenureMonths: liability?.tenureMonths ?? "",
  interestCalculationType: liability?.interestCalculationType || "reducing",
  manualOutstandingOverride: liability?.manualOutstandingOverride ?? "",
  notes: liability?.notes || ""
});

function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [viewData, setViewData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const fetchLiabilities = async () => {
    const response = await api.get("/liabilities");
    setLiabilities(response.data || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        await fetchLiabilities();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load liabilities");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const refreshDashboard = () => window.dispatchEvent(new CustomEvent("dashboard:refresh"));

  const sortedLiabilities = useMemo(() => [...liabilities].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))), [liabilities]);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

  const openCreateModal = () => {
    setEditingId("");
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (liability) => {
    setEditingId(liability._id);
    setFormData(toFormData(liability));
    setIsModalOpen(true);
  };

  const openViewModal = async (liability) => {
    try {
      const response = await api.get(`/liabilities/${liability._id}`);
      setViewData(response.data);
      setIsViewOpen(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to fetch liability details");
    }
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setFormData(initialFormData);
    setEditingId("");
  };

  const handleInputChange = ({ target: { name, value } }) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      ...formData,
      principalAmount: Number(formData.principalAmount),
      interestRateAnnual: Number(formData.interestRateAnnual),
      emiAmount: Number(formData.emiAmount),
      tenureMonths: Number(formData.tenureMonths),
      manualOutstandingOverride: formData.manualOutstandingOverride === "" ? null : Number(formData.manualOutstandingOverride)
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await api.put(`/liabilities/${editingId}`, payload);
      } else {
        await api.post("/liabilities", payload);
      }
      await fetchLiabilities();
      closeModal();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save liability");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeletingId(deleteTarget._id);
    try {
      await api.delete(`/liabilities/${deleteTarget._id}`);
      setDeleteTarget(null);
      await fetchLiabilities();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete liability");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <section className="space-y-8 lg:w-fit lg:max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Liabilities</h2>
          <p className="mt-1 text-sm text-brand-muted">Track outstanding loans with dynamic outstanding balance computation.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Add Liability</button>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading liabilities...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && sortedLiabilities.length > 0 ? (
        <div className="w-full overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft lg:w-fit lg:max-w-full">
          <div className="overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3">Name</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Principal</th><th className="px-5 py-3">Interest %</th><th className="px-5 py-3">EMI</th><th className="px-5 py-3">Interest Mode</th><th className="px-5 py-3">Outstanding</th><th className="px-5 py-3">Months Remaining</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {sortedLiabilities.map((liability) => (
                  <tr key={liability._id}>
                    <td className="px-5 py-3">{liability.name}</td>
                    <td className="px-5 py-3">{liability.type}</td>
                    <td className="px-5 py-3">{formatCurrency(liability.principalAmount)}</td>
                    <td className="px-5 py-3">{Number(liability.interestRateAnnual || 0).toFixed(2)}%</td>
                    <td className="px-5 py-3">{formatCurrency(liability.emiAmount)}</td>
                    <td className="px-5 py-3 capitalize">{liability.interestCalculationType || "reducing"}</td>
                    <td className="px-5 py-3 font-semibold">{formatCurrency(liability.outstandingComputed)}</td>
                    <td className="px-5 py-3">{liability.monthsRemaining}</td>
                    <td className="px-5 py-3">{liability.isClosed ? "Closed" : "Open"}</td>
                    <td className="px-5 py-3"><div className="flex gap-2"><button type="button" className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold" onClick={() => openViewModal(liability)}>View</button><button type="button" className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold" onClick={() => openEditModal(liability)}>Edit</button><button type="button" onClick={() => setDeleteTarget(liability)} disabled={deletingId === liability._id} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-brand-line bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-brand-text">{editingId ? "Edit Liability" : "Add Liability"}</h3>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Name
                <input name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Car Loan" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Type
                <select name="type" value={formData.type} onChange={handleInputChange} className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal">{liabilityTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Principal Amount
                <input name="principalAmount" type="number" value={formData.principalAmount} onChange={handleInputChange} required placeholder="e.g. 2500000" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Interest Rate (% per year)
                <input name="interestRateAnnual" type="number" step="0.01" value={formData.interestRateAnnual} onChange={handleInputChange} required placeholder="e.g. 9.5" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                EMI Amount
                <input name="emiAmount" type="number" value={formData.emiAmount} onChange={handleInputChange} required placeholder="e.g. 28000" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Start Date
                <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} required className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Tenure (Months)
                <input name="tenureMonths" type="number" value={formData.tenureMonths} onChange={handleInputChange} required placeholder="e.g. 120" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Interest Mode
                <select name="interestCalculationType" value={formData.interestCalculationType} onChange={handleInputChange} className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal">
                  {interestModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Manual Outstanding Override (Optional)
                <input name="manualOutstandingOverride" type="number" value={formData.manualOutstandingOverride} onChange={handleInputChange} placeholder="Leave blank to auto-compute" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1.5 text-sm font-medium text-brand-text">
                Notes
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Add notes about this liability" className="rounded-xl border border-brand-line px-3 py-2 text-sm font-normal" rows={3} />
              </label>
              <div className="sm:col-span-2 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-xl border border-brand-line px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{isSaving ? "Saving..." : "Save"}</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {isViewOpen && viewData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-brand-line bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between"><h3 className="text-lg font-semibold text-brand-text">{viewData.name}</h3><button type="button" className="rounded-lg border border-brand-line px-3 py-1 text-xs" onClick={() => setIsViewOpen(false)}>Close</button></div>
            <p className="mt-2 text-sm text-brand-muted">Outstanding: <span className="font-semibold text-brand-text">{formatCurrency(viewData.outstandingComputed)}</span> | Mode: <span className="font-semibold text-brand-text capitalize">{viewData.interestCalculationType || "reducing"}</span></p>
            <div className="mt-4 overflow-x-auto">
              <table className="fo-table"><thead className="bg-slate-50"><tr><th className="px-4 py-2">Start Date</th><th className="px-4 py-2">Tenure</th><th className="px-4 py-2">Months Elapsed</th><th className="px-4 py-2">Months Remaining</th><th className="px-4 py-2">Status</th></tr></thead><tbody className="fo-table-body"><tr><td className="px-4 py-2">{formatDate(viewData.startDate)}</td><td className="px-4 py-2">{viewData.tenureMonths}</td><td className="px-4 py-2">{viewData.monthsElapsed}</td><td className="px-4 py-2">{viewData.monthsRemaining}</td><td className="px-4 py-2">{viewData.isClosed ? "Closed" : "Open"}</td></tr></tbody></table>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete Liability"
        message={`Delete ${deleteTarget?.name || "this liability"}?`}
        confirmText={deletingId ? "Deleting..." : "Delete"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

export default LiabilitiesPage;
