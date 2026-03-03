import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/api";

const MODE_PIN = "pin";
const MODE_PASSWORD = "password";
const MODE_RECOVERY = "recovery";
const MODE_RECOVERY_KEY = "recovery-key";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(MODE_PIN);
  const [knownUsername, setKnownUsername] = useState("");

  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [savedConfirmation, setSavedConfirmation] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const response = await authApi.status();
        if (!active) {
          return;
        }

        const statusUsername = String(response?.data?.username || "").trim();
        setKnownUsername(statusUsername);
        if (statusUsername) {
          setUsernameInput(statusUsername);
        }
      } catch {
        // Status read failure should not block authentication UI.
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, []);

  const handlePinLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^[0-9]{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.loginPin({ pin });
      navigate("/portfolio", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = knownUsername
        ? { password }
        : { username: usernameInput.trim(), password };
      await authApi.loginPassword(payload);
      navigate("/portfolio", { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecover = async (event) => {
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
        recoveryKey: recoveryKeyInput,
        newPassword,
        newPin
      });

      const rotatedKey = String(response?.data?.newRecoveryKey || "");
      if (rotatedKey) {
        setNewRecoveryKey(rotatedKey);
        setSavedConfirmation(false);
        setMode(MODE_RECOVERY_KEY);
      } else {
        setMode(MODE_PIN);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to recover account.");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (mode === MODE_RECOVERY_KEY) {
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

          <button
            type="button"
            disabled={!savedConfirmation}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={() => {
              setMode(MODE_PIN);
              setNewRecoveryKey("");
              setRecoveryKeyInput("");
              setNewPassword("");
              setConfirmPassword("");
              setNewPin("");
              setConfirmPin("");
              setPassword("");
              setPin("");
            }}
          >
            Continue to PIN Login
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">
          {mode === MODE_PIN ? "Enter PIN" : mode === MODE_PASSWORD ? "Enter Password" : "Recover Account"}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {mode === MODE_PIN ? "Use your PIN to unlock FinanceOS." : mode === MODE_PASSWORD ? "Use your account password." : "Reset password and PIN with recovery key."}
        </p>

        {mode === MODE_PIN ? (
          <form className="mt-6 space-y-4" onSubmit={handlePinLogin}>
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-pin">PIN</label>
              <input id="auth-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Unlocking..." : "Unlock"}
            </button>

            <button type="button" className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4" onClick={() => { setError(""); setMode(MODE_PASSWORD); }}>
              Use password instead
            </button>
          </form>
        ) : null}

        {mode === MODE_PASSWORD ? (
          <form className="mt-6 space-y-4" onSubmit={handlePasswordLogin}>
            {knownUsername ? (
              <div className="rounded-xl border border-brand-line bg-brand-bg px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-brand-muted">Username</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{knownUsername}</p>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-username">Username</label>
                <input id="auth-username" type="text" autoComplete="username" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={usernameInput} onChange={(event) => setUsernameInput(event.target.value)} />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-password">Password</label>
              <input id="auth-password" type="password" autoComplete="current-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Logging in..." : "Login"}
            </button>

            <div className="flex flex-col gap-2">
              <button type="button" className="text-left text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4" onClick={() => { setError(""); setMode(MODE_PIN); }}>
                Use PIN instead
              </button>
              <button type="button" className="text-left text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4" onClick={() => { setError(""); setMode(MODE_RECOVERY); }}>
                Forgot password?
              </button>
            </div>
          </form>
        ) : null}

        {mode === MODE_RECOVERY ? (
          <form className="mt-6 space-y-4" onSubmit={handleRecover}>
            <p className="text-xs text-rose-700">If you lose this recovery key, you cannot reset your password and PIN.</p>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-recovery-key">Recovery Key</label>
              <textarea id="auth-recovery-key" rows={3} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={recoveryKeyInput} onChange={(event) => setRecoveryKeyInput(event.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-new-password">New Password</label>
              <input id="auth-new-password" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-confirm-password">Confirm Password</label>
              <input id="auth-confirm-password" type="password" autoComplete="new-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-new-pin">New PIN</label>
              <input id="auth-new-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="auth-confirm-pin">Confirm PIN</label>
              <input id="auth-confirm-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Resetting..." : "Reset"}
            </button>

            <button type="button" className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4" onClick={() => { setError(""); setMode(MODE_PASSWORD); }}>
              Back to password login
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export default AuthPage;
