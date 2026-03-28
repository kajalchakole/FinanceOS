import React, { useEffect, useMemo, useState } from "react";

import AddAssetModal from "../components/AddAssetModal";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";

const defaultFormData = {
  name: "",
  category: "Real Estate",
  allocationCategory: "",
  purchaseValue: "",
  currentValue: "",
  purchaseDate: "",
  notes: ""
};

function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [editingAsset, setEditingAsset] = useState(null);
  const [deletingAsset, setDeletingAsset] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  const fetchAssets = async () => {
    setError("");
    try {
      const response = await api.get("/assets");
      const nonGoldAssets = (response.data?.data || []).filter((asset) => asset.category !== "Gold");
      setAssets(nonGoldAssets);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load assets");
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchAssets();
      setIsLoading(false);
    };

    load();
  }, []);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return "-";
    }

    return parsed.toLocaleDateString("en-IN");
  };

  const totalAssetsValue = useMemo(() => (
    assets.reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0)
  ), [assets]);

  const resetModal = () => {
    setEditingAsset(null);
    setFormData(defaultFormData);
    setModalError("");
    setIsModalOpen(false);
  };

  const handleAdd = () => {
    setEditingAsset(null);
    setFormData(defaultFormData);
    setModalError("");
    setIsModalOpen(true);
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || "",
      category: asset.category || "Real Estate",
      allocationCategory: asset.allocationCategory || "",
      purchaseValue: String(asset.purchaseValue ?? ""),
      currentValue: String(asset.currentValue ?? ""),
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : "",
      notes: asset.notes || ""
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleDelete = (asset) => {
    setDeletingAsset(asset);
    setDeleteError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setModalError("");

    if (!String(formData.name || "").trim()) {
      setModalError("Name is required");
      return;
    }

    if (Number(formData.purchaseValue) < 0 || Number(formData.currentValue) < 0) {
      setModalError("purchaseValue and currentValue must be non-negative");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        name: String(formData.name || "").trim(),
        purchaseValue: Number(formData.purchaseValue),
        currentValue: Number(formData.currentValue),
        allocationCategory: formData.allocationCategory || null,
        purchaseDate: formData.purchaseDate || null,
        notes: String(formData.notes || "").trim()
      };

      if (editingAsset?._id) {
        await api.put(`/assets/${editingAsset._id}`, payload);
      } else {
        await api.post("/assets", payload);
      }

      await fetchAssets();
      resetModal();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
    } catch (requestError) {
      setModalError(requestError.response?.data?.message || "Unable to save asset");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAsset?._id) {
      return;
    }

    setDeleteError("");
    setIsDeleting(true);

    try {
      await api.delete(`/assets/${deletingAsset._id}`);
      setDeletingAsset(null);
      await fetchAssets();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
    } catch (requestError) {
      setDeleteError(requestError.response?.data?.message || "Unable to delete asset");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-text">Assets</h2>
          <p className="mt-1 text-sm text-brand-muted">Track real-world wealth like real estate, vehicle, and cash.</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Asset
        </button>
      </div>

      <article className="app-surface-card p-4 sm:p-6">
        <p className="text-sm text-brand-muted">Total Assets Value</p>
        <p className="mt-2 text-2xl font-semibold text-brand-text">{formatCurrency(totalAssetsValue)}</p>
      </article>

      {isLoading ? <p className="text-sm text-brand-muted">Loading assets...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && !error && assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No assets yet. Add your first asset to track your net worth.
        </div>
      ) : null}

      {!isLoading && !error && assets.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
          <div className="overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">Asset Name</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Category</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Purchase Value</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Current Value</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Purchase Date</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {assets.map((asset) => (
                  <tr key={asset._id}>
                    <td className="px-5 py-3 text-brand-text">{asset.name}</td>
                    <td className="px-5 py-3 text-brand-muted">{asset.category}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatCurrency(asset.purchaseValue)}</td>
                    <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(asset.currentValue)}</td>
                    <td className="px-5 py-3 text-brand-muted">{formatDate(asset.purchaseDate)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(asset)}
                          className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(asset)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          Delete
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

      <AddAssetModal
        isOpen={isModalOpen}
        isSaving={isSaving}
        isEditMode={Boolean(editingAsset)}
        formData={formData}
        error={modalError}
        onChange={handleChange}
        onClose={resetModal}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(deletingAsset)}
        title="Delete Asset"
        message={deletingAsset
          ? `Are you sure you want to delete "${deletingAsset.name}"? This action cannot be undone.`
          : ""}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={isDeleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!isDeleting) {
            setDeletingAsset(null);
          }
        }}
        onConfirm={confirmDelete}
        ariaLabelledBy="delete-asset-title"
      />
    </section>
  );
}

export default AssetsPage;
