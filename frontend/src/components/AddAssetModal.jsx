import React from "react";

const assetCategories = ["Real Estate", "Vehicle", "Cash", "Business", "Other"];

function AddAssetModal({
  isOpen,
  isSaving,
  isEditMode,
  formData,
  error,
  onChange,
  onClose,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <article
        className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-brand-text">{isEditMode ? "Edit Asset" : "Add Asset"}</h3>

        <form className="mt-5 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-brand-text">
              <span>Name *</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Category *</span>
              <select
                name="category"
                value={formData.category}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              >
                {assetCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Purchase Value *</span>
              <input
                type="number"
                name="purchaseValue"
                min="0"
                step="0.01"
                value={formData.purchaseValue}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Current Value *</span>
              <input
                type="number"
                name="currentValue"
                min="0"
                step="0.01"
                value={formData.currentValue}
                onChange={onChange}
                required
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text">
              <span>Purchase Date</span>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={onChange}
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-brand-text md:col-span-2">
              <span>Notes</span>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={onChange}
                className="w-full rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-text outline-none ring-0 focus:border-slate-400"
              />
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

export default AddAssetModal;
