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
  notes: ""
};

function FixedDepositsPage() {
  const [fixedDeposits, setFixedDeposits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

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
    setFixedDeposits(normalizeFixedDeposits(response.data));
  };

  useEffect(() => {
    const loadFixedDeposits = async () => {
      try {
        setError("");
        await fetchFixedDeposits();
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

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

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
                  <th className="px-5 py-3 font-semibold text-brand-text">Compounding</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Auto Renew</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {fixedDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-6 text-center text-sm text-brand-muted">
                      No fixed deposits found.
                    </td>
                  </tr>
                ) : fixedDeposits.map((deposit) => (
                  <tr key={deposit._id}>
                    <td className="px-5 py-3 text-brand-text">{deposit.bank}</td>
                    <td className="px-5 py-3 text-brand-text">{deposit.fdName}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatCurrency(deposit.principal)}</td>
                    <td className="px-5 py-3 text-brand-muted">{Number(deposit.interestRate || 0).toFixed(2)}%</td>
                    <td className="px-5 py-3 text-brand-muted">{deposit.startDate?.slice(0, 10)}</td>
                    <td className="px-5 py-3 text-brand-muted">{deposit.maturityDate?.slice(0, 10)}</td>
                    <td className="px-5 py-3 text-brand-muted capitalize">{deposit.compounding}</td>
                    <td className="px-5 py-3 text-brand-muted">{deposit.isAutoRenew ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}

export default FixedDepositsPage;
