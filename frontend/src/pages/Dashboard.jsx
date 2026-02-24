import React, { useEffect, useMemo, useState } from "react";

import api from "../services/api";

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

    return () => {
      window.removeEventListener("dashboard:refresh", handleDashboardRefresh);
    };
  }, []);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;

  const isGapPositive = (summary?.totalGap || 0) >= 0;
  const overallStatus = summary?.overallStatus || "At Risk";
  const statusBadgeClassName = useMemo(() => (
    overallStatus === "On Track"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700"
  ), [overallStatus]);

  const cards = [
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
        <span className={`inline-flex rounded-lg border px-3 py-1 text-sm font-semibold ${statusBadgeClassName}`}>
          {overallStatus}
        </span>
      )
    }
  ];

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Dashboard</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Consolidated portfolio readiness across active goals.
          {summary ? ` ${summary.goalCountIncluded} goals included.` : ""}
        </p>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading dashboard...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-brand-line bg-brand-panel p-6 shadow-soft">
            <p className="text-sm text-brand-muted">{card.title}</p>
            <div className="mt-4 min-h-10">
              {card.renderValue || (
                <p className={`text-2xl font-semibold tracking-tight text-brand-text ${card.valueClassName || ""}`}>
                  {card.value}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardPage;
