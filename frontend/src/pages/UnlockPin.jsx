import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/api";

function UnlockPinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^[0-9]{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.verifyPin({ pin });
      navigate("/portfolio", { replace: true });
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message;
      if (requestError?.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiMessage || "Unable to verify PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">Unlock with PIN</h1>
        <p className="mt-2 text-sm text-brand-muted">Enter your 4-digit PIN to continue.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="unlock-pin">PIN</label>
            <input id="unlock-pin" type="password" inputMode="numeric" maxLength={4} className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default UnlockPinPage;
