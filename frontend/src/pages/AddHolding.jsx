import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

const initialFormState = {
  broker: "",
  instrumentName: "",
  instrumentType: "",
  quantity: "",
  averagePrice: "",
  currentPrice: "",
  goalId: ""
};

function AddHoldingPage() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [goals, setGoals] = useState([]);
  const [isLoadingHolding, setIsLoadingHolding] = useState(isEditMode);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await api.get("/goals");
        setGoals(response.data || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load goals");
      } finally {
        setIsLoadingGoals(false);
      }
    };

    fetchGoals();
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const fetchHolding = async () => {
      setError("");
      setIsLoadingHolding(true);

      try {
        const response = await api.get(`/holdings/${id}`);
        const holding = response.data;

        setFormData({
          broker: holding.broker || "",
          instrumentName: holding.instrumentName || "",
          instrumentType: holding.instrumentType || "",
          quantity: holding.quantity?.toString() || "",
          averagePrice: holding.averagePrice?.toString() || "",
          currentPrice: holding.currentPrice?.toString() || "",
          goalId: holding.goalId?._id || ""
        });
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load holding");
      } finally {
        setIsLoadingHolding(false);
      }
    };

    fetchHolding();
  }, [id, isEditMode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        broker: formData.broker.trim(),
        instrumentName: formData.instrumentName.trim(),
        instrumentType: formData.instrumentType.trim(),
        quantity: Number(formData.quantity),
        averagePrice: Number(formData.averagePrice),
        currentPrice: Number(formData.currentPrice),
        goalId: formData.goalId || null
      };

      if (isEditMode) {
        await api.put(`/holdings/${id}`, payload);
      } else {
        await api.post("/holdings", payload);
      }

      navigate("/holdings");
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${isEditMode ? "update" : "add"} holding`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">{isEditMode ? "Edit Holding" : "Add Holding"}</h2>
        <p className="mt-1 text-sm text-brand-muted">
          {isEditMode
            ? "Update your instrument details and goal link."
            : "Capture your portfolio instrument details and optionally link it to a goal."}
        </p>
      </div>

      {isLoadingHolding ? <p className="text-sm text-brand-muted">Loading holding...</p> : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Broker</span>
            <input
              type="text"
              name="broker"
              value={formData.broker}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="e.g. Zerodha"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Instrument Name</span>
            <input
              type="text"
              name="instrumentName"
              value={formData.instrumentName}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="e.g. NIFTYBEES"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Instrument Type</span>
            <input
              type="text"
              name="instrumentType"
              value={formData.instrumentType}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="e.g. ETF"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Quantity</span>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Average Price</span>
            <input
              type="number"
              step="0.01"
              name="averagePrice"
              value={formData.averagePrice}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="250.00"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-brand-text">Current Price</span>
            <input
              type="number"
              step="0.01"
              name="currentPrice"
              value={formData.currentPrice}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="275.00"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-brand-text">Linked Goal</span>
            <select
              name="goalId"
              value={formData.goalId}
              onChange={handleChange}
              disabled={isLoadingGoals}
              className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">No link</option>
              {goals.map((goal) => (
                <option key={goal._id} value={goal._id}>{goal.name}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/holdings")}
            className="rounded-xl border border-brand-line px-5 py-2.5 text-sm font-medium text-brand-text transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingGoals || isLoadingHolding}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Update Holding" : "Add Holding"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddHoldingPage;
