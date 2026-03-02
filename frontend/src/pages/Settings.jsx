import React, { useEffect, useState } from "react";

import api from "../services/api";

function SettingsPage() {
  const [intervalDays, setIntervalDays] = useState("1");
  const [epfIntervalDays, setEpfIntervalDays] = useState("30");
  const [npsIntervalDays, setNpsIntervalDays] = useState("30");
  const [ppfIntervalDays, setPpfIntervalDays] = useState("365");
  const [loading, setLoading] = useState(true);
  const [savingFd, setSavingFd] = useState(false);
  const [savingEpf, setSavingEpf] = useState(false);
  const [savingNps, setSavingNps] = useState(false);
  const [savingPpf, setSavingPpf] = useState(false);
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

        if (isMounted && Number.isFinite(response.data?.epfRefreshIntervalDays)) {
          setEpfIntervalDays(String(response.data.epfRefreshIntervalDays));
        }

        if (isMounted && Number.isFinite(response.data?.npsRefreshIntervalDays)) {
          setNpsIntervalDays(String(response.data.npsRefreshIntervalDays));
        }

        if (isMounted && Number.isFinite(response.data?.ppfRefreshIntervalDays)) {
          setPpfIntervalDays(String(response.data.ppfRefreshIntervalDays));
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
    const parsedInterval = Number(epfIntervalDays);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      setError("EPF interval must be an integer between 1 and 365.");
      return;
    }

    setError("");
    setSavingEpf(true);

    try {
      await api.patch("/settings/epf-interval", { intervalDays: parsedInterval });
      setSuccess("EPF settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save EPF settings");
    } finally {
      setSavingEpf(false);
    }
  };

  const handleSaveNPS = async () => {
    const parsedInterval = Number(npsIntervalDays);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      setError("NPS interval must be an integer between 1 and 365.");
      return;
    }

    setError("");
    setSavingNps(true);

    try {
      await api.patch("/settings/nps-interval", { intervalDays: parsedInterval });
      setSuccess("NPS settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save NPS settings");
    } finally {
      setSavingNps(false);
    }
  };

  const handleSavePPF = async () => {
    const parsedInterval = Number(ppfIntervalDays);

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 3650) {
      setError("PPF interval must be an integer between 1 and 3650.");
      return;
    }

    setError("");
    setSavingPpf(true);

    try {
      await api.patch("/settings/ppf-interval", { intervalDays: parsedInterval });
      setSuccess("PPF settings saved");
      setTimeout(() => setSuccess(""), 2000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save PPF settings");
    } finally {
      setSavingPpf(false);
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
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="epfRefreshInterval">Refresh Interval (Days)</label>
            <input
              id="epfRefreshInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={365}
              step={1}
              value={epfIntervalDays}
              onChange={(event) => setEpfIntervalDays(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingEpf} onClick={handleSaveEPF}>
              {savingEpf ? "Saving..." : "Save EPF"}
            </button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">NPS Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="npsRefreshInterval">Refresh Interval (Days)</label>
            <input
              id="npsRefreshInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={365}
              step={1}
              value={npsIntervalDays}
              onChange={(event) => setNpsIntervalDays(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingNps} onClick={handleSaveNPS}>
              {savingNps ? "Saving..." : "Save NPS"}
            </button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">PPF Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="ppfRefreshInterval">Refresh Interval (Days)</label>
            <input
              id="ppfRefreshInterval"
              className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-accent"
              type="number"
              min={1}
              max={3650}
              step={1}
              value={ppfIntervalDays}
              onChange={(event) => setPpfIntervalDays(event.target.value)}
            />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingPpf} onClick={handleSavePPF}>
              {savingPpf ? "Saving..." : "Save PPF"}
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
