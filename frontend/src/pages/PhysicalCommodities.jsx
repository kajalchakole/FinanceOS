import React, { useEffect, useMemo, useState } from "react";

import ConfirmationModal from "../components/ConfirmationModal";
import PhysicalCommodityModal from "../components/PhysicalCommodityModal";
import api from "../services/api";

const initialFormData = {
  name: "",
  commodityType: "Gold",
  quantity: "",
  unit: "grams",
  averageCostPerUnit: "",
  currentPricePerUnit: "",
  goalId: "",
  isActive: true
};

const toModalForm = (commodity) => ({
  name: commodity?.name || "",
  commodityType: commodity?.commodityType || "Gold",
  quantity: commodity?.quantity ?? "",
  unit: commodity?.unit || "grams",
  averageCostPerUnit: commodity?.averageCostPerUnit ?? "",
  currentPricePerUnit: commodity?.currentPricePerUnit ?? "",
  goalId: commodity?.goalId?._id || commodity?.goalId || "",
  isActive: commodity?.isActive !== undefined ? Boolean(commodity.isActive) : true
});

function PhysicalCommoditiesPage() {
  const [commodities, setCommodities] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCommodityId, setEditingCommodityId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingCommodityId, setDeletingCommodityId] = useState("");

  const fetchData = async () => {
    const [commoditiesResponse, goalsResponse] = await Promise.all([
      api.get("/physical-commodities"),
      api.get("/goals")
    ]);

    setCommodities(commoditiesResponse.data || []);
    setGoals(goalsResponse.data || []);
  };

  useEffect(() => {
    const loadPage = async () => {
      try {
        setError("");
        await fetchData();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load physical commodities");
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, []);

  const refreshDashboard = () => {
    window.dispatchEvent(new CustomEvent("dashboard:refresh"));
  };

  const sortedCommodities = useMemo(() => {
    return [...commodities].sort((left, right) => {
      return String(left.name || "").localeCompare(String(right.name || ""), undefined, { sensitivity: "base" });
    });
  }, [commodities]);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  const openCreateModal = () => {
    setError("");
    setEditingCommodityId("");
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (commodity) => {
    setError("");
    setEditingCommodityId(commodity._id);
    setFormData(toModalForm(commodity));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingCommodityId("");
    setFormData(initialFormData);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSaveCommodity = async (event) => {
    event.preventDefault();
    setError("");

    if (!String(formData.name || "").trim()) {
      setError("Name is required.");
      return;
    }

    const quantity = Number(formData.quantity);
    const averageCostPerUnit = Number(formData.averageCostPerUnit);
    const currentPricePerUnit = Number(formData.currentPricePerUnit);

    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(averageCostPerUnit) || averageCostPerUnit < 0) {
      setError("Average cost per unit must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(currentPricePerUnit) || currentPricePerUnit < 0) {
      setError("Current price per unit must be a non-negative number.");
      return;
    }

    const payload = {
      name: formData.name,
      commodityType: formData.commodityType,
      quantity,
      unit: formData.unit,
      averageCostPerUnit,
      currentPricePerUnit,
      goalId: formData.goalId || null,
      isActive: Boolean(formData.isActive)
    };

    setIsSaving(true);

    try {
      if (editingCommodityId) {
        await api.put(`/physical-commodities/${editingCommodityId}`, payload);
      } else {
        await api.post("/physical-commodities", payload);
      }

      await fetchData();
      closeModal();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save physical commodity");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (commodity) => {
    setError("");
    setDeleteTarget(commodity);
  };

  const closeDeleteModal = () => {
    if (deletingCommodityId) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) {
      return;
    }

    setError("");
    setDeletingCommodityId(deleteTarget._id);

    try {
      await api.delete(`/physical-commodities/${deleteTarget._id}`);
      setDeleteTarget(null);
      await fetchData();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete physical commodity");
    } finally {
      setDeletingCommodityId("");
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Physical Commodities</h2>
          <p className="mt-1 text-sm text-brand-muted">Track manual gold and silver entries with goal linking.</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Commodity
        </button>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading physical commodities...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && !error && sortedCommodities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No physical commodities found.
        </div>
      ) : null}

      {!isLoading && sortedCommodities.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-line text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-brand-text">Name</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Type</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Quantity</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Avg Cost / Unit</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Current Price / Unit</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Current Value</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Linked Goal</th>
                  <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {sortedCommodities.map((commodity) => {
                  const currentValue = Number(commodity.currentValue ?? (Number(commodity.quantity || 0) * Number(commodity.currentPricePerUnit || 0)));

                  return (
                    <tr key={commodity._id}>
                      <td className="px-5 py-3 text-brand-text">{commodity.name}</td>
                      <td className="px-5 py-3 text-brand-muted">{commodity.commodityType}</td>
                      <td className="px-5 py-3 text-brand-muted">{Number(commodity.quantity || 0)} {commodity.unit}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(commodity.averageCostPerUnit)}</td>
                      <td className="px-5 py-3 text-brand-muted">{formatCurrency(commodity.currentPricePerUnit)}</td>
                      <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(currentValue)}</td>
                      <td className="px-5 py-3 text-brand-muted">{commodity.goalId?.name || "Unlinked"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(commodity)}
                            className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(commodity)}
                            disabled={deletingCommodityId === commodity._id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingCommodityId === commodity._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <PhysicalCommodityModal
        isOpen={isModalOpen}
        isSaving={isSaving}
        isEditMode={Boolean(editingCommodityId)}
        formData={formData}
        goals={goals}
        error={error}
        onChange={handleInputChange}
        onClose={closeModal}
        onSubmit={handleSaveCommodity}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Commodity"
        message={deleteTarget
          ? `Are you sure you want to delete "${deleteTarget.name}"? This will hide it from calculations.`
          : ""}
        confirmLabel="Delete"
        variant="danger"
        isProcessing={Boolean(deleteTarget && deletingCommodityId === deleteTarget._id)}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
        ariaLabelledBy="delete-commodity-title"
      />
    </section>
  );
}

export default PhysicalCommoditiesPage;
