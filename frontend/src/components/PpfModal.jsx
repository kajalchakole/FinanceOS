import React from "react";

const initialFormData = {
  name: "",
  openingBalance: "",
  openingBalanceAsOf: "",
  annualContribution: "",
  annualInterestRatePct: "",
  isActive: true
};

function PpfModal({
  show,
  isEditMode,
  formData,
  saving,
  onChange,
  onSubmit,
  onClose
}) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-brand-text">{isEditMode ? "Edit PPF" : "Add PPF"}</h3>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1 text-sm text-brand-text">
            <span className="font-medium">Name</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="name"
              placeholder="e.g. PPF Account"
              value={formData.name}
              onChange={onChange}
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
              onChange={onChange}
            />
          </label>
          <label className="block space-y-1 text-sm text-brand-text">
            <span className="font-medium">Opening Balance As Of</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="openingBalanceAsOf"
              type="date"
              value={formData.openingBalanceAsOf}
              onChange={onChange}
            />
          </label>
          <label className="block space-y-1 text-sm text-brand-text">
            <span className="font-medium">Annual Contribution</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="annualContribution"
              type="number"
              min={0}
              placeholder="0"
              value={formData.annualContribution}
              onChange={onChange}
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
              onChange={onChange}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input name="isActive" type="checkbox" checked={formData.isActive} onChange={onChange} />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PpfModal.initialFormData = initialFormData;

export default PpfModal;
