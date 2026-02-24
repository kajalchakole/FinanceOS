import React, { useState } from "react";

import api from "../services/api";

const getBackendBaseUrl = () => {
  const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
  return baseUrl.replace(/\/api$/, "");
};

function BrokerSyncDrawer({
  isOpen,
  brokers,
  onClose,
  onSyncSuccess,
  onRefreshBrokers
}) {
  const [loadingBroker, setLoadingBroker] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return "Never";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Never";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const handleAction = async (broker) => {
    setError("");

    if (!broker.connected) {
      if (broker.name === "kite") {
        window.location.href = `${getBackendBaseUrl()}/api/brokers/kite/connect`;
      }

      return;
    }

    setLoadingBroker(broker.name);

    try {
      if (broker.name === "kite") {
        await api.post("/brokers/kite/sync");
      }

      await onSyncSuccess(`${broker.name} sync completed`);
      onClose();
      await onRefreshBrokers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to sync broker");
    } finally {
      setLoadingBroker("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <button
        type="button"
        onClick={onClose}
        className="h-full flex-1 cursor-default"
        aria-label="Close broker sync drawer backdrop"
      />

      <aside className="h-full w-full max-w-md border-l border-brand-line bg-slate-100 p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight text-brand-text">Broker Sync Center</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {brokers.map((broker) => (
            <article key={broker.name} className="rounded-2xl border border-brand-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">{broker.name}</p>
                  <p className="mt-1 text-xs text-brand-muted">
                    Status: {broker.connected ? "Connected" : "Not Connected"}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">Last Sync: {formatDateTime(broker.lastSyncAt)}</p>
                  <p className="mt-1 text-xs text-brand-muted">Holdings: {broker.holdingsCount}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction(broker)}
                  disabled={loadingBroker === broker.name}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingBroker === broker.name
                    ? "Please wait..."
                    : broker.connected
                      ? "Sync Now"
                      : "Connect"}
                </button>
              </div>
            </article>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
      </aside>
    </div>
  );
}

export default BrokerSyncDrawer;
