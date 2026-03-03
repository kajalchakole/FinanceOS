import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "../services/api";

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [knownUsername, setKnownUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const response = await authApi.status();
        if (!active) {
          return;
        }

        const statusUsername = String(response?.data?.username || "").trim();
        if (statusUsername) {
          setKnownUsername(statusUsername);
          setUsername(statusUsername);
        }
      } catch {
        // Login still works without prefilling username.
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = knownUsername
        ? { password }
        : { username: username.trim(), password };
      await authApi.login(payload);
      const statusResponse = await authApi.status();

      if (statusResponse.data?.needsPin) {
        navigate("/unlock", { replace: true });
      } else {
        navigate("/portfolio", { replace: true });
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-text">Sign in to FinanceOS</h1>
        <p className="mt-2 text-sm text-brand-muted">Use your username and password.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {knownUsername ? (
            <div className="rounded-xl border border-brand-line bg-brand-bg px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-brand-muted">Username</p>
              <p className="mt-1 text-sm font-semibold text-brand-text">{knownUsername}</p>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="login-username">Username</label>
              <input id="login-username" type="text" autoComplete="username" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-text" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" className="w-full rounded-xl border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-text" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-sm text-brand-muted">
            <Link to="/recover" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
              Forgot password + PIN? Use Recovery Key
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
