import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/api";

function SetupAuthPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("form");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [savedConfirmation, setSavedConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  const handleCopyRecoveryKey = async () => {
    if (!recoveryKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopyMessage("Recovery key copied.");
    } catch {
      setCopyMessage("Unable to copy automatically. Please copy manually.");
    }
  };

  const handleDownloadRecoveryKey = () => {
    if (!recoveryKey) {
      return;
    }

    const contents = [
      "FinanceOS Recovery Key",
      "",
      "If you lose this recovery key, you cannot reset your password and PIN.",
      "",
      `Recovery Key: ${recoveryKey}`
    ].join("\n");

    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financeos-recovery-key.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    if (username.trim().length < 3 || username.trim().length > 30) {
      setError("Username must be between 3 and 30 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PIN values do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (!accountCreated) {
        await authApi.register({
          username: username.trim(),
          password,
          pin
        });
        setAccountCreated(true);
      }

      const recoveryResponse = await authApi.generateRecoveryKey();
      setRecoveryKey(String(recoveryResponse?.data?.recoveryKey || ""));
      setSavedConfirmation(false);
      setStage("recovery");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to complete setup. If account is already created, try again to generate recovery key.");
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "recovery") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-text">Your Recovery Key</h1>
          <p className="mt-2 text-sm text-brand-muted">If you lose this recovery key, you cannot reset your password and PIN.</p>

          <div className="mt-5 rounded-xl border border-amber-400 bg-amber-100/40 p-4 dark:border-yellow-900/40 dark:bg-yellow-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Save This Now</p>
            <p className="mt-2 break-words rounded-md bg-white p-3 font-mono text-sm text-slate-900 dark:bg-[#161D26] dark:text-[#F3F4F6]">{recoveryKey}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={handleCopyRecoveryKey}>Copy</button>
            <button type="button" className="rounded-xl border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-text dark:bg-[#161D26] dark:border-[#1F2937] dark:text-[#F3F4F6]" onClick={handleDownloadRecoveryKey}>Download .txt</button>
          </div>

          {copyMessage ? <p className="mt-2 text-sm text-brand-muted">{copyMessage}</p> : null}

          <label className="mt-6 flex items-center gap-2 text-sm text-brand-text">
            <input type="checkbox" checked={savedConfirmation} onChange={(event) => setSavedConfirmation(event.target.checked)} />
            I have saved this key
          </label>

          <button type="button" disabled={!savedConfirmation} className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400" onClick={() => navigate("/auth", { replace: true })}>
            Continue
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">Setup FinanceOS Access</h1>
        <p className="mt-2 text-sm text-brand-muted">Create your username, password, and 4-digit PIN.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="setup-username">Username</label>
            <input id="setup-username" type="text" autoComplete="username" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="setup-password">Password</label>
            <input id="setup-password" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="setup-password-confirm">Confirm Password</label>
            <input id="setup-password-confirm" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="setup-pin">PIN</label>
            <input id="setup-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="setup-pin-confirm">Confirm PIN</label>
            <input id="setup-pin-confirm" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Setting up..." : "Complete Setup"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default SetupAuthPage;
