import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

const initialFormState = {
  name: "",
  type: "one-time",
  targetYear: "",
  presentValue: "",
  initialInvestment: "",
  inflationRate: "",
  expectedReturnRate: "",
  monthlySIP: "",
  stepUpRate: 10
};

function CreateGoalPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await api.post("/goals", {
        name: formData.name.trim(),
        type: formData.type,
        targetYear: Number(formData.targetYear),
        presentValue: Number(formData.presentValue),
        initialInvestment:
          formData.initialInvestment === "" ? 0 : Number(formData.initialInvestment),
        inflationRate: Number(formData.inflationRate),
        expectedReturnRate: Number(formData.expectedReturnRate),
        monthlySIP: formData.monthlySIP === "" ? 0 : Number(formData.monthlySIP),
        stepUpRate: formData.stepUpRate === "" ? 10 : Number(formData.stepUpRate)
      });

      navigate("/goals");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Create Goal</h2>
        <p className="mt-1 text-sm text-brand-muted">Set up your goal assumptions for planning workflows.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft"
      >
        <div className="space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-muted">Basic Info</h3>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-brand-text">Goal Name</span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="e.g. Retirement Corpus"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Type</span>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="one-time">One-time</option>
                <option value="recurring">Recurring</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Target Year</span>
              <input
                type="number"
                name="targetYear"
                value={formData.targetYear}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="2045"
              />
            </label>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-muted">
            Financial Assumptions
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Present Value</span>
              <input
                type="number"
                name="presentValue"
                value={formData.presentValue}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="1000000"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Inflation %</span>
              <input
                type="number"
                step="0.01"
                name="inflationRate"
                value={formData.inflationRate}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="6"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Initial Investment</span>
              <input
                type="number"
                name="initialInvestment"
                value={formData.initialInvestment}
                onChange={handleChange}
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="0"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Expected Return %</span>
              <input
                type="number"
                step="0.01"
                name="expectedReturnRate"
                value={formData.expectedReturnRate}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Monthly SIP</span>
              <input
                type="number"
                name="monthlySIP"
                value={formData.monthlySIP}
                onChange={handleChange}
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="0"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-brand-text">Step Up %</span>
              <input
                type="number"
                step="0.01"
                name="stepUpRate"
                value={formData.stepUpRate}
                onChange={handleChange}
                className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="10"
              />
            </label>
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/goals")}
            className="rounded-xl border border-brand-line px-5 py-2.5 text-sm font-medium text-brand-text transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : "Create Goal"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CreateGoalPage;
