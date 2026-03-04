import React from "react";

import AmountHint from "./AmountHint";

const commodityTypes = ["Gold", "Silver"];
const units = ["grams", "kg"];

function PhysicalCommodityModal({
  isOpen,
  isSaving,
  isEditMode,
  formData,
  goals,
  error,
  onChange,
  onClose,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <article
        className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-brand-text">
          {isEditMode ? "Edit Commodity" : "Add Commodity"}
        </h3>

        <form className="mt-5 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-brand-text">
              <span>Name *</span>
              <input
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Commodity Type *</span>
              <select
                name="commodityType"
                value={formData.commodityType}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              >
                {commodityTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Quantity *</span>
              <input
                type="number"
                name="quantity"
                min="0"
                step="0.0001"
                value={formData.quantity}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Unit *</span>
              <select
                name="unit"
                value={formData.unit}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Average Cost per Unit *</span>
              <input
                type="number"
                name="averageCostPerUnit"
                min="0"
                step="0.01"
                value={formData.averageCostPerUnit}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
              <AmountHint value={formData.averageCostPerUnit} />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Current Price per Unit *</span>
              <input
                type="number"
                name="currentPricePerUnit"
                min="0"
                step="0.01"
                value={formData.currentPricePerUnit}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
              <AmountHint value={formData.currentPricePerUnit} />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Link to Goal (Optional)</span>
              <select
                name="goalId"
                value={formData.goalId}
                onChange={onChange}
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              >
                <option value="">Unassigned</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>{goal.name}</option>
                ))}
              </select>
            </label>

            <label className="mt-8 flex items-center gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                name="isActive"
                checked={Boolean(formData.isActive)}
                onChange={onChange}
                className="h-4 w-4 rounded border-brand-line"
              />
              <span>Active</span>
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}

export default PhysicalCommodityModal;
