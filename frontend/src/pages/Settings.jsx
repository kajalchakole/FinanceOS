import React, { useEffect, useState } from "react";

import api from "../services/api";

function SettingsPage() {
  const [intervalDays, setIntervalDays] = useState("1");
  const [epfIntervalHours, setEpfIntervalHours] = useState("168");
  const [npsIntervalHours, setNpsIntervalHours] = useState("168");
  const [loading, setLoading] = useState(true);
  const [savingFd, setSavingFd] = useState(false);
  const [savingEpf, setSavingEpf] = useState(false);
  const [savingNps, setSavingNps] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");

        if (isMounted && Number.isFinite(response.data?.fdRecalculationIntervalDays)) {
          setIntervalDays(String(response.data.fdRecalculationIntervalDays));
        }

        if (isMounted && Number.isFinite(response.data?.epfRefreshIntervalHours)) {
          setEpfIntervalHours(String(response.data.epfRefreshIntervalHours));
        }

        if (isMounted && Number.isFinite(response.data?.npsRefreshIntervalHours)) {
          setNpsIntervalHours(String(response.data.npsRefreshIntervalHours));
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

  const handleSaveFD = async () => {
    const parsedInterval = Number(intervalDays);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      setError("FD interval must be an integer between 1 and 365.");
      return;
    }

    setError("");
    setSavingFd(true);

    try {
      await api.patch("/settings/fd-interval", { intervalDays: parsedInterval });
      setSuccess("FD settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save FD settings");
    } finally {
      setSavingFd(false);
    }
  };

  const handleSaveEPF = async () => {
    const parsedInterval = Number(epfIntervalHours);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 24 * 365) {
      setError("EPF interval must be an integer between 1 and 8760.");
      return;
    }

    setError("");
    setSavingEpf(true);

    try {
      await api.patch("/settings/epf-interval", { intervalHours: parsedInterval });
      setSuccess("EPF settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save EPF settings");
    } finally {
      setSavingEpf(false);
    }
  };

  const handleSaveNPS = async () => {
    const parsedInterval = Number(npsIntervalHours);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 24 * 365) {
      setError("NPS interval must be an integer between 1 and 8760.");
      return;
    }

    setError("");
    setSavingNps(true);

    try {
      await api.patch("/settings/nps-interval", { intervalHours: parsedInterval });
      setSuccess("NPS settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save NPS settings");
    } finally {
      setSavingNps(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
      <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Settings</h2>

      {loading ? <p className="mt-3 text-sm text-brand-muted">Loading...</p> : null}

      {!loading ? (
        <div className="mt-6 space-y-8">
          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">Fixed Deposit Recalculation</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="fdRecalculationInterval">Recalculation Interval (Days)</label>
            <input
              id="fdRecalculationInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={365}
              step={1}
              value={intervalDays}
              onChange={(event) => setIntervalDays(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingFd} onClick={handleSaveFD}>
              {savingFd ? "Saving..." : "Save FD"}
            </button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">EPF Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="epfRefreshInterval">Refresh Interval (Hours)</label>
            <input
              id="epfRefreshInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={8760}
              step={1}
              value={epfIntervalHours}
              onChange={(event) => setEpfIntervalHours(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingEpf} onClick={handleSaveEPF}>
              {savingEpf ? "Saving..." : "Save EPF"}
            </button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">NPS Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="npsRefreshInterval">Refresh Interval (Hours)</label>
            <input
              id="npsRefreshInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={8760}
              step={1}
              value={npsIntervalHours}
              onChange={(event) => setNpsIntervalHours(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingNps} onClick={handleSaveNPS}>
              {savingNps ? "Saving..." : "Save NPS"}
            </button>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-500">{success}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default SettingsPage;
