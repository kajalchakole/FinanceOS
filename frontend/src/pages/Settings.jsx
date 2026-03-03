import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { backupApi, settingsApi } from "../services/api";

function SettingsPage() {
  const navigate = useNavigate();
  const [intervalDays, setIntervalDays] = useState("1");
  const [epfIntervalDays, setEpfIntervalDays] = useState("30");
  const [npsIntervalDays, setNpsIntervalDays] = useState("30");
  const [ppfIntervalDays, setPpfIntervalDays] = useState("365");
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupIntervalDays, setBackupIntervalDays] = useState("7");
  const [backupRetentionCount, setBackupRetentionCount] = useState("10");
  const [backupDirectory, setBackupDirectory] = useState("data/backups");
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [backupPassphraseConfigured, setBackupPassphraseConfigured] = useState(false);
  const [latestBackup, setLatestBackup] = useState(null);
  const [manualBackupPassword, setManualBackupPassword] = useState("");
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("");
  const [showManualBackupModal, setShowManualBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingFd, setSavingFd] = useState(false);
  const [savingEpf, setSavingEpf] = useState(false);
  const [savingNps, setSavingNps] = useState(false);
  const [savingPpf, setSavingPpf] = useState(false);
  const [savingBackupSettings, setSavingBackupSettings] = useState(false);
  const [savingPassphrase, setSavingPassphrase] = useState(false);
  const [savingManualBackup, setSavingManualBackup] = useState(false);
  const [savingRestore, setSavingRestore] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const restoreAllowed = useMemo(
    () => restoreConfirmInput.trim() === "CONFIRM" && restoreFile && restorePassword,
    [restoreConfirmInput, restoreFile, restorePassword]
  );

  const fetchLatestBackup = async () => {
    try {
      const response = await backupApi.latest();
      setLatestBackup(response.data);
    } catch {
      setLatestBackup(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await settingsApi.get();
        const data = response.data || {};

        if (!isMounted) {
          return;
        }

        if (Number.isFinite(data.fdRecalculationIntervalDays)) {
          setIntervalDays(String(data.fdRecalculationIntervalDays));
        }
        if (Number.isFinite(data.epfRefreshIntervalDays)) {
          setEpfIntervalDays(String(data.epfRefreshIntervalDays));
        }
        if (Number.isFinite(data.npsRefreshIntervalDays)) {
          setNpsIntervalDays(String(data.npsRefreshIntervalDays));
        }
        if (Number.isFinite(data.ppfRefreshIntervalDays)) {
          setPpfIntervalDays(String(data.ppfRefreshIntervalDays));
        }

        setBackupEnabled(Boolean(data.backupEnabled));
        if (Number.isFinite(data.backupIntervalDays)) {
          setBackupIntervalDays(String(data.backupIntervalDays));
        }
        if (Number.isFinite(data.backupRetentionCount)) {
          setBackupRetentionCount(String(data.backupRetentionCount));
        }
        setBackupDirectory(data.backupDirectory || "data/backups");
        setBackupPassphraseConfigured(Boolean(data.backupPassphraseConfigured));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.all([fetchSettings(), fetchLatestBackup()]);

    return () => {
      isMounted = false;
    };
  }, []);

  const withSuccess = (message) => {
    setError("");
    setSuccess(message);
    setTimeout(() => setSuccess(""), 2500);
  };

  const handleSaveFD = async () => {
    const parsedInterval = Number(intervalDays);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 365) {
      setError("FD interval must be an integer between 1 and 365.");
      return;
    }
    setSavingFd(true);
    setError("");
    try {
      await settingsApi.updateFDInterval(parsedInterval);
      withSuccess("FD settings saved");
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
    setSavingEpf(true);
    setError("");
    try {
      await settingsApi.updateEPFInterval(parsedInterval);
      withSuccess("EPF settings saved");
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
    setSavingNps(true);
    setError("");
    try {
      await settingsApi.updateNPSInterval(parsedInterval);
      withSuccess("NPS settings saved");
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
    setSavingPpf(true);
    setError("");
    try {
      await settingsApi.updatePPFInterval(parsedInterval);
      withSuccess("PPF settings saved");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save PPF settings");
    } finally {
      setSavingPpf(false);
    }
  };

  const handleSaveBackupSettings = async () => {
    const interval = Number(backupIntervalDays);
    const retention = Number(backupRetentionCount);

    if (!Number.isInteger(interval) || interval < 1) {
      setError("Backup interval must be an integer >= 1 day.");
      return;
    }

    if (!Number.isInteger(retention) || retention < 1 || retention > 50) {
      setError("Backup retention count must be between 1 and 50.");
      return;
    }

    setSavingBackupSettings(true);
    setError("");
    try {
      await settingsApi.updateBackupSettings({
        backupEnabled,
        backupIntervalDays: interval,
        backupRetentionCount: retention,
        backupDirectory
      });
      withSuccess("Backup settings saved");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save backup settings");
    } finally {
      setSavingBackupSettings(false);
    }
  };

  const handleSetPassphrase = async () => {
    if (!backupPassphrase.trim()) {
      setError("Enter a passphrase to configure auto backup.");
      return;
    }

    setSavingPassphrase(true);
    setError("");
    try {
      await settingsApi.setBackupPassphrase(backupPassphrase);
      setBackupPassphrase("");
      setBackupPassphraseConfigured(true);
      withSuccess("Auto backup passphrase configured");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to set passphrase");
    } finally {
      setSavingPassphrase(false);
    }
  };

  const handleClearPassphrase = async () => {
    setSavingPassphrase(true);
    setError("");
    try {
      await settingsApi.clearBackupPassphrase();
      setBackupPassphraseConfigured(false);
      setBackupPassphrase("");
      withSuccess("Auto backup passphrase cleared");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to clear passphrase");
    } finally {
      setSavingPassphrase(false);
    }
  };

  const handleCreateManualBackup = async () => {
    if (!manualBackupPassword.trim()) {
      setError("Backup password is required.");
      return;
    }

    setSavingManualBackup(true);
    setError("");
    try {
      await backupApi.create(manualBackupPassword);
      setManualBackupPassword("");
      setShowManualBackupModal(false);
      await fetchLatestBackup();
      withSuccess("Backup created successfully");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create backup");
    } finally {
      setSavingManualBackup(false);
    }
  };

  const handleDownloadLatest = async () => {
    setError("");
    try {
      const response = await backupApi.downloadLatest();
      const contentDisposition = response.headers["content-disposition"] || "";
      const filename = contentDisposition.includes("filename=")
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : "financeos-backup.json";
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to download latest backup");
    }
  };

  const handleRestore = async () => {
    if (!restoreAllowed) {
      setError("Select file, enter password, and type CONFIRM to proceed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", restoreFile);
    formData.append("password", restorePassword);
    formData.append("confirm", "true");

    setSavingRestore(true);
    setError("");
    try {
      await backupApi.restore(formData);
      setRestorePassword("");
      setRestoreConfirmInput("");
      setRestoreFile(null);
      setShowRestoreModal(false);
      withSuccess("Restore completed successfully");
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to restore backup");
    } finally {
      setSavingRestore(false);
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
            <input id="fdRecalculationInterval" className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} max={365} step={1} value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingFd} onClick={handleSaveFD}>{savingFd ? "Saving..." : "Save FD"}</button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">EPF Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="epfRefreshInterval">Refresh Interval (Days)</label>
            <input id="epfRefreshInterval" className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} max={365} step={1} value={epfIntervalDays} onChange={(event) => setEpfIntervalDays(event.target.value)} />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingEpf} onClick={handleSaveEPF}>{savingEpf ? "Saving..." : "Save EPF"}</button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">NPS Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="npsRefreshInterval">Refresh Interval (Days)</label>
            <input id="npsRefreshInterval" className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} max={365} step={1} value={npsIntervalDays} onChange={(event) => setNpsIntervalDays(event.target.value)} />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingNps} onClick={handleSaveNPS}>{savingNps ? "Saving..." : "Save NPS"}</button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">PPF Refresh</h3>
            <label className="mb-2 mt-4 block text-sm font-medium text-brand-text" htmlFor="ppfRefreshInterval">Refresh Interval (Days)</label>
            <input id="ppfRefreshInterval" className="w-full max-w-xs rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} max={3650} step={1} value={ppfIntervalDays} onChange={(event) => setPpfIntervalDays(event.target.value)} />
            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingPpf} onClick={handleSavePPF}>{savingPpf ? "Saving..." : "Save PPF"}</button>
          </div>

          <div className="border-t border-brand-line pt-6">
            <h3 className="text-lg font-semibold text-brand-text">Backup &amp; Restore</h3>
            <div className="mt-4 flex items-center gap-2">
              <input id="backupEnabled" type="checkbox" checked={backupEnabled} onChange={(event) => setBackupEnabled(event.target.checked)} />
              <label htmlFor="backupEnabled" className="text-sm font-medium text-brand-text">Enable Auto Backup</label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="backupIntervalDays">Backup Interval (Days)</label>
                <input id="backupIntervalDays" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} step={1} value={backupIntervalDays} onChange={(event) => setBackupIntervalDays(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="backupRetentionCount">Backup Retention Count</label>
                <input id="backupRetentionCount" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="number" min={1} max={50} step={1} value={backupRetentionCount} onChange={(event) => setBackupRetentionCount(event.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="backupDirectory">Backup Directory</label>
              <input id="backupDirectory" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={backupDirectory} onChange={(event) => setBackupDirectory(event.target.value)} />
            </div>

            <button type="button" className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={handleSaveBackupSettings} disabled={savingBackupSettings}>{savingBackupSettings ? "Saving..." : "Save Backup Settings"}</button>

            <div className="mt-6 rounded-xl border border-amber-400/70 bg-amber-100/40 p-4 text-sm text-amber-800">
              <p className="font-semibold">Auto Backup Passphrase</p>
              <p className="mt-1">Without passphrase, auto backup will not run. Store it safely.</p>
              <input className="mt-3 w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="password" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} placeholder="Enter auto backup passphrase" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingPassphrase} onClick={handleSetPassphrase}>{savingPassphrase ? "Saving..." : "Set/Update Passphrase"}</button>
                <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text" disabled={savingPassphrase} onClick={handleClearPassphrase}>Clear Passphrase</button>
              </div>
              <p className="mt-2 text-xs text-brand-muted">Passphrase configured: {backupPassphraseConfigured ? "Yes" : "No"}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowManualBackupModal(true)}>Backup Now</button>
              <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text" onClick={handleDownloadLatest}>Download Latest Backup</button>
              <button type="button" className="rounded-xl border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600" onClick={() => setShowRestoreModal(true)}>Restore From File</button>
            </div>

            {latestBackup ? <p className="mt-3 text-xs text-brand-muted">Latest backup: {latestBackup.filename} ({new Date(latestBackup.createdAt).toLocaleString()})</p> : <p className="mt-3 text-xs text-brand-muted">No backup found yet.</p>}
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-500">{success}</p> : null}
        </div>
      ) : null}

      {showManualBackupModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-semibold text-brand-text">Backup Now</h4>
            <p className="mt-2 text-sm text-brand-muted">Enter a password. It is used only for this backup and is never stored.</p>
            <input className="mt-3 w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="password" value={manualBackupPassword} onChange={(event) => setManualBackupPassword(event.target.value)} placeholder="Backup password" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm" onClick={() => { setShowManualBackupModal(false); setManualBackupPassword(""); }}>Cancel</button>
              <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" disabled={savingManualBackup} onClick={handleCreateManualBackup}>{savingManualBackup ? "Creating..." : "Create Backup"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showRestoreModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5">
            <h4 className="text-lg font-semibold text-brand-text">Restore From File</h4>
            <p className="mt-2 rounded-md bg-rose-100 p-2 text-sm text-rose-700">Warning: This will overwrite your current FinanceOS data.</p>
            <input className="mt-3 w-full" type="file" accept="application/json,.json" onChange={(event) => setRestoreFile(event.target.files?.[0] || null)} />
            <input className="mt-3 w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" type="password" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} placeholder="Backup password" />
            <label className="mt-3 block text-sm text-brand-text">Type <strong>CONFIRM</strong> to continue</label>
            <input className="mt-2 w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={restoreConfirmInput} onChange={(event) => setRestoreConfirmInput(event.target.value)} placeholder="CONFIRM" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-brand-line px-4 py-2 text-sm" onClick={() => { setShowRestoreModal(false); setRestorePassword(""); setRestoreConfirmInput(""); setRestoreFile(null); }}>Cancel</button>
              <button type="button" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white" disabled={!restoreAllowed || savingRestore} onClick={handleRestore}>{savingRestore ? "Restoring..." : "Restore"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default SettingsPage;
