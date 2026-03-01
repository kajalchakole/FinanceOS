import React, { useMemo, useState } from "react";

import api from "../services/api";

const getBackendBaseUrl = () => {
  const baseUrl = api.defaults.baseURL || "http://localhost:5000/api";
  return baseUrl.replace(/\/api$/, "");
};

const getConnectUrl = (brokerName) => `${getBackendBaseUrl()}/api/brokers/${brokerName}/connect`;

function BrokerSyncDrawer({
  isOpen,
  brokers,
  onClose,
  onSyncSuccess,
  onRefreshBrokers
}) {
  const [brokerUiState, setBrokerUiState] = useState({});

  const stateByBroker = useMemo(() => (
    brokers.reduce((accumulator, broker) => {
      accumulator[broker.name] = brokerUiState[broker.name] || { mode: "idle", message: "" };
      return accumulator;
    }, {})
  ), [brokerUiState, brokers]);

  if (!isOpen) {
    return null;
  }

  const setUiState = (brokerName, nextState) => {
    setBrokerUiState((current) => ({
      ...current,
      [brokerName]: nextState
    }));
  };

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

  const connectBroker = (brokerName) => {
    window.location.href = getConnectUrl(brokerName);
  };

  const handleSyncAction = async (broker) => {
    setUiState(broker.name, { mode: "syncing", message: "" });

    try {
      await api.post(`/brokers/${broker.name}/sync`);
      setUiState(broker.name, { mode: "idle", message: "" });
      await onSyncSuccess(`${broker.name} sync completed`);
      await onRefreshBrokers();
      onClose();
    } catch (requestError) {
      const status = requestError.response?.status;
      const code = requestError.response?.data?.code;
      const message = requestError.response?.data?.message || "Sync failed";

      if (status === 401 || code === "BROKER_SESSION_EXPIRED") {
        setUiState(broker.name, { mode: "expired", message: "Session expired. Please reconnect." });
        return;
      }

      if (status === 400 || code === "BROKER_NOT_CONNECTED") {
        setUiState(broker.name, { mode: "not_connected", message });
        return;
      }

      if (status === 400 && code === "BROKER_NOT_SUPPORTED") {
        setUiState(broker.name, {
          mode: "failed",
          message: broker.name === "breeze"
            ? "Breeze reconnect is env-based. Update BREEZE_SESSION_TOKEN in backend env."
            : message
        });
        return;
      }

      setUiState(broker.name, { mode: "failed", message: requestError.response?.data?.message || "Sync failed. Try again." });
    }
  };

  const getSyncButtonLabel = (broker) => {
    const brokerState = stateByBroker[broker.name] || { mode: "idle" };

    if (brokerState.mode === "syncing") {
      return "Syncing...";
    }

    if (brokerState.mode === "failed") {
      return "Try Again";
    }

    return "Sync Now";
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
          {brokers.map((broker) => {
            const brokerState = stateByBroker[broker.name] || { mode: "idle", message: "" };
            const shouldShowConnectOnly = !broker.connected || brokerState.mode === "expired" || brokerState.mode === "not_connected";

            return (
              <article key={broker.name} className="rounded-2xl border border-brand-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-text">{broker.name}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      Status: {broker.connected ? "Connected" : "Not Connected"}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted">Last Sync: {formatDateTime(broker.lastSyncAt)}</p>
                    <p className="mt-1 text-xs text-brand-muted">Holdings: {broker.holdingsCount}</p>
                    {brokerState.message ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">{brokerState.message}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {shouldShowConnectOnly ? (
                      <button
                        type="button"
                        onClick={() => connectBroker(broker.name)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        {broker.connected ? "Reconnect" : "Connect"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncAction(broker)}
                          disabled={brokerState.mode === "syncing"}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {getSyncButtonLabel(broker)}
                        </button>
                        <button
                          type="button"
                          onClick={() => connectBroker(broker.name)}
                          className="rounded-xl border border-brand-line bg-white px-3 py-2 text-xs font-semibold text-brand-muted transition hover:bg-slate-50"
                        >
                          Reconnect
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

export default BrokerSyncDrawer;
