import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/api";

function RecoverPage() {
  const navigate = useNavigate();
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [savedConfirmation, setSavedConfirmation] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const handleCopyRecoveryKey = async () => {
    if (!newRecoveryKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(newRecoveryKey);
      setCopyMessage("Recovery key copied.");
    } catch {
      setCopyMessage("Unable to copy automatically. Please copy manually.");
    }
  };

  const handleDownloadRecoveryKey = () => {
    if (!newRecoveryKey) {
      return;
    }

    const contents = [
      "FinanceOS Recovery Key",
      "",
      "If you lose this recovery key, you cannot reset your password and PIN.",
      "",
      `Recovery Key: ${newRecoveryKey}`
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

    if (newPassword.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^[0-9]{4}$/.test(newPin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PIN values do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.recover({
        recoveryKey,
        newPassword,
        newPin
      });

      const rotatedKey = String(response?.data?.newRecoveryKey || "");
      if (rotatedKey) {
        setNewRecoveryKey(rotatedKey);
        setSavedConfirmation(false);
      } else {
        navigate("/login", { replace: true });
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to recover account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (newRecoveryKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
        <section className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-text">New Recovery Key</h1>
          <p className="mt-2 text-sm text-brand-muted">Your old recovery key is invalid now. Save this new key before continuing.</p>

          <div className="mt-5 rounded-xl border border-amber-400 bg-amber-100/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Save This Now</p>
            <p className="mt-2 break-words rounded-md bg-white p-3 font-mono text-sm text-slate-900">{newRecoveryKey}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={handleCopyRecoveryKey}>Copy</button>
            <button type="button" className="rounded-xl border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-text" onClick={handleDownloadRecoveryKey}>Download .txt</button>
          </div>

          {copyMessage ? <p className="mt-2 text-sm text-brand-muted">{copyMessage}</p> : null}

          <label className="mt-6 flex items-center gap-2 text-sm text-brand-text">
            <input type="checkbox" checked={savedConfirmation} onChange={(event) => setSavedConfirmation(event.target.checked)} />
            I have saved this key
          </label>

          <button type="button" disabled={!savedConfirmation} className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400" onClick={() => navigate("/login", { replace: true })}>
            Continue to Login
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">Account Recovery</h1>
        <p className="mt-2 text-sm text-brand-muted">Use your recovery key to reset password and PIN.</p>
        <p className="mt-2 text-xs text-rose-700">If you lose this recovery key, you cannot reset your password and PIN.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="recover-key">Recovery Key</label>
            <textarea id="recover-key" rows={3} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="recover-password">New Password</label>
            <input id="recover-password" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="recover-password-confirm">Confirm Password</label>
            <input id="recover-password-confirm" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="recover-pin">New PIN</label>
            <input id="recover-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="recover-pin-confirm">Confirm PIN</label>
            <input id="recover-pin-confirm" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Recovering..." : "Reset Password and PIN"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default RecoverPage;
