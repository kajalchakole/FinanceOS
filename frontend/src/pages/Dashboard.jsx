import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { usePortfolio } from "../context/PortfolioContext";
import { useBackupStatus } from "../hooks/useBackupStatus";
import api from "../services/api";

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshPortfolio } = usePortfolio();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reconnectToast, setReconnectToast] = useState("");
  const { health, lastBackupText } = useBackupStatus();

  useEffect(() => {
    const fetchDashboard = async () => {
      setError("");
      try {
        const response = await api.get("/dashboard");
        setSummary(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load dashboard data");
      }
    };

    const loadDashboard = async () => {
      setIsLoading(true);
      await fetchDashboard();
      setIsLoading(false);
    };

    const handleDashboardRefresh = () => {
      fetchDashboard();
    };

    loadDashboard();
    window.addEventListener("dashboard:refresh", handleDashboardRefresh);
    const handlePortfolioRefreshed = (event) => {
      const nextDashboard = event.detail?.dashboard;

      if (nextDashboard) {
        setSummary(nextDashboard);
        setError("");
        setIsLoading(false);
      }
    };
    window.addEventListener("portfolio:refreshed", handlePortfolioRefreshed);

    return () => {
      window.removeEventListener("dashboard:refresh", handleDashboardRefresh);
      window.removeEventListener("portfolio:refreshed", handlePortfolioRefreshed);
    };
  }, []);

  useEffect(() => {
    if (!reconnectToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setReconnectToast("");
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reconnectToast]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reconnectedBroker = params.get("reconnected");
    const reconnectedDisplay = params.get("reconnectedDisplay");

    if (!reconnectedBroker) {
      return;
    }

    setReconnectToast(`${reconnectedDisplay || reconnectedBroker} reconnected. Syncing portfolio...`);
    refreshPortfolio().catch(() => {});
    params.delete("reconnected");
    params.delete("reconnectedDisplay");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : ""
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, refreshPortfolio]);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

  const isGapPositive = (summary?.totalGap || 0) >= 0;
  const overallStatus = summary?.overallStatus || "At Risk";
  const statusBadgeClassName = useMemo(() => (
    overallStatus === "On Track"
      ? "bg-green-50 text-green-600 dark:bg-green-900/25 dark:text-green-400"
      : "bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-400"
  ), [overallStatus]);

  const cards = [
    {
      title: "Total Assets",
      value: formatCurrency(summary?.totalAssets ?? summary?.totalAssetsValue)
    },
    {
      title: "Total Liabilities",
      value: formatCurrency(summary?.totalLiabilities ?? summary?.totalLiabilitiesOutstanding)
    },
    {
      title: "Net Worth",
      value: formatCurrency(summary?.netWorth),
      valueClassName: Number(summary?.netWorth || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
    },
    {
      title: "Debt-to-Asset %",
      value: `${Number(summary?.debtToAssetRatioPct || 0).toFixed(2)}%`
    }
  ];

  const planningCards = [
    {
      title: "Total Future Required",
      value: formatCurrency(summary?.totalFutureRequired)
    },
    {
      title: "Total Projected Corpus",
      value: formatCurrency(summary?.totalProjectedCorpus)
    },
    {
      title: "Total Gap",
      value: formatCurrency(summary?.totalGap),
      valueClassName: isGapPositive ? "text-emerald-600" : "text-rose-600"
    },
    {
      title: "Overall Status",
      value: overallStatus,
      renderValue: (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClassName}`}>
          {overallStatus}
        </span>
      )
    }
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6]">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
          Consolidated portfolio readiness across active goals.
          {summary ? ` ${summary.goalCountIncluded} goals included.` : ""}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-[#6B7280]">{lastBackupText}</p>
      </div>

      {health ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          health.severity === "critical"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-yellow-200 bg-yellow-50 text-yellow-700"
        }`}>
          <p>{health.severity === "critical" ? "Critical: " : "Warning: "}{health.message}</p>
          <button
            type="button"
            className="mt-2 rounded-full border border-current px-3 py-1 text-xs font-semibold transition-all duration-200 ease-out hover:bg-white/60"
            onClick={() => navigate("/settings")}
          >
            Backup Now
          </button>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Loading dashboard...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="app-surface-card p-4 transition-all duration-200 ease-out hover:-translate-y-[2px] sm:p-6">
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{card.title}</p>
            <div className="mt-2 min-h-10">
              {card.renderValue || (
                <p className={`text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6] ${card.valueClassName || ""}`}>
                  {card.value}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {planningCards.map((card) => (
          <article key={card.title} className="app-surface-card p-4 transition-all duration-200 ease-out hover:-translate-y-[2px] sm:p-6">
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{card.title}</p>
            <div className="mt-2 min-h-10">
              {card.renderValue || (
                <p className={`text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6] ${card.valueClassName || ""}`}>
                  {card.value}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {reconnectToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-[#1F2937] dark:bg-green-900/25 dark:text-green-400 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          {reconnectToast}
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
