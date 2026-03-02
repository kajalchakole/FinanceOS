import React from "react";

const initialFormData = {
  name: "",
  openingBalance: "",
  openingBalanceAsOf: "",
  monthlyContribution: "",
  annualExpectedReturnPct: "",
  isActive: true
};

function NpsModal({
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
        <h3 className="text-lg font-semibold text-brand-text">{isEditMode ? "Edit NPS" : "Add NPS"}</h3>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1 text-sm text-brand-text">
            <span className="font-medium">Name</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="name"
              placeholder="e.g. NPS Primary"
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
            <span className="font-medium">Monthly Contribution</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="monthlyContribution"
              type="number"
              min={0}
              placeholder="0"
              value={formData.monthlyContribution}
              onChange={onChange}
            />
          </label>
          <label className="block space-y-1 text-sm text-brand-text">
            <span className="font-medium">Expected Return (%)</span>
            <input
              className="w-full rounded-xl border border-brand-line px-3 py-2"
              name="annualExpectedReturnPct"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={formData.annualExpectedReturnPct}
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

NpsModal.initialFormData = initialFormData;

export default NpsModal;
