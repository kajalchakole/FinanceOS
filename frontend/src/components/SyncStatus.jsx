import React, { useEffect, useMemo, useState } from "react";

import { usePortfolio } from "../context/PortfolioContext";
import api from "../services/api";
import BrokerSyncDrawer from "./BrokerSyncDrawer";

const isDateToday = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  );
};

function SyncStatus() {
  const [brokers, setBrokers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const { refreshPortfolio } = usePortfolio();
  const visibleBrokers = brokers.filter((broker) => broker.name !== "manual");

  const fetchBrokers = async () => {
    const response = await api.get("/brokers");
    setBrokers(response.data || []);
  };

  useEffect(() => {
    const loadBrokers = async () => {
      try {
        await fetchBrokers();
      } finally {
        setIsLoading(false);
      }
    };

    loadBrokers();
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  const status = useMemo(() => {
    if (isLoading) {
      return "Checking";
    }

    const connectedBrokers = visibleBrokers
      .filter((broker) => broker.connected && broker.name !== "manual");

    if (connectedBrokers.length === 0) {
      return "Not Connected";
    }

    const hasOutdatedBroker = connectedBrokers.some((broker) => !isDateToday(broker.lastSyncAt));

    return hasOutdatedBroker ? "Outdated" : "Up to Date";
  }, [isLoading, visibleBrokers]);

  const statusClassName = status === "Up to Date"
    ? "text-emerald-700"
    : status === "Outdated"
      ? "text-amber-700"
      : "text-brand-muted";

  const handleSyncSuccess = async (message) => {
    await refreshPortfolio();
    setToastMessage(message);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="rounded-xl border border-brand-line bg-white px-4 py-2 text-sm text-brand-muted transition hover:bg-slate-50"
      >
        Sync:
        {" "}
        <span className={`font-semibold ${statusClassName}`}>{status}</span>
      </button>

      <BrokerSyncDrawer
        isOpen={drawerOpen}
        brokers={visibleBrokers}
        onClose={() => setDrawerOpen(false)}
        onSyncSuccess={handleSyncSuccess}
        onRefreshBrokers={fetchBrokers}
      />

      {toastMessage ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-soft">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}

export default SyncStatus;
