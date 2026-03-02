import React, { useEffect, useState } from "react";

import api from "../services/api";

function SettingsPage() {
  const [intervalDays, setIntervalDays] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");

        if (isMounted && Number.isFinite(response.data?.fdRecalculationIntervalDays)) {
          setIntervalDays(String(response.data.fdRecalculationIntervalDays));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    const parsedInterval = Number(intervalDays);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      setError("Interval must be an integer between 1 and 365.");
      setSuccess(false);
      return;
    }

    setError("");
    setSaving(true);

    try {
      await api.patch("/settings/fd-interval", { intervalDays: parsedInterval });
      setIntervalDays(String(parsedInterval));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save settings");
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
      <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Settings</h2>

      <div className="mt-6 border-t border-brand-line pt-6">
        <h3 className="text-lg font-semibold text-brand-text">Fixed Deposit Recalculation</h3>

        {loading ? <p className="mt-3 text-sm text-brand-muted">Loading...</p> : null}

        {!loading ? (
          <div className="mt-4 space-y-4">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-brand-text"
                htmlFor="fdRecalculationInterval"
              >
                Recalculation Interval (Days)
              </label>
              <input
                id="fdRecalculationInterval"
                className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
                type="number"
                min={1}
                max={365}
                step={1}
                value={intervalDays}
                onChange={(event) => {
                  setIntervalDays(event.target.value);
                  setError("");
                  setSuccess(false);
                }}
              />
            </div>

            <p className="text-sm text-brand-muted">
              FD values will automatically refresh only if the last calculation is older than this interval.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={loading || saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-500">Saved successfully</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SettingsPage;
