import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { usePortfolio } from "../context/PortfolioContext";
import { useBackupStatus } from "../hooks/useBackupStatus";
import api from "../services/api";

const chartColors = {
  Equity: "#4F46E5",
  "Mutual Fund": "#0EA5E9",
  ETF: "#14B8A6",
  "Real Estate": "#F59E0B",
  Vehicle: "#FB7185",
  Gold: "#EAB308",
  Cash: "#22C55E",
  Business: "#8B5CF6",
  Other: "#6B7280"
};

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshPortfolio } = usePortfolio();
  const [summary, setSummary] = useState(null);
  const [allocationSummary, setAllocationSummary] = useState(null);
  const [goalIntelligence, setGoalIntelligence] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [opportunityForm, setOpportunityForm] = useState({
    marketDropPercent: "",
    opportunityFundValue: ""
  });
  const [opportunityResult, setOpportunityResult] = useState(null);
  const [opportunityError, setOpportunityError] = useState("");
  const [isEvaluatingOpportunity, setIsEvaluatingOpportunity] = useState(false);
  const [reconnectToast, setReconnectToast] = useState("");
  const { health, lastBackupText } = useBackupStatus();

  const fetchDashboardIntelligence = async () => {
    setError("");

    try {
      const [networthResponse, allocationResponse, goalIntelligenceResponse] = await Promise.all([
        api.get("/networth"),
        api.get("/allocation"),
        api.get("/goals/intelligence")
      ]);

      setSummary(networthResponse.data || {});
      setAllocationSummary(allocationResponse.data || {});
      setGoalIntelligence(Array.isArray(goalIntelligenceResponse.data) ? goalIntelligenceResponse.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load dashboard intelligence");
    }
  };

  const handleOpportunityChange = (event) => {
    const { name, value } = event.target;
    setOpportunityForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleOpportunityEvaluate = async (event) => {
    event.preventDefault();
    setOpportunityError("");
    setIsEvaluatingOpportunity(true);

    try {
      const payload = {
        marketDropPercent: Number(opportunityForm.marketDropPercent),
        opportunityFundValue: Number(opportunityForm.opportunityFundValue)
      };
      const response = await api.post("/opportunity/evaluate", payload);
      setOpportunityResult(response.data || null);
    } catch (requestError) {
      setOpportunityError(requestError.response?.data?.message || "Unable to evaluate opportunity");
      setOpportunityResult(null);
    } finally {
      setIsEvaluatingOpportunity(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      await fetchDashboardIntelligence();
      setIsLoading(false);
    };

    const handleDashboardRefresh = () => {
      fetchDashboardIntelligence();
    };

    const handlePortfolioRefreshed = () => {
      fetchDashboardIntelligence();
    };

    loadDashboard();
    window.addEventListener("dashboard:refresh", handleDashboardRefresh);
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

  const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
  const formatRecoverySuggestion = (suggestion = {}) => {
    if (suggestion.type === "Increase SIP") {
      return `Increase SIP by ${formatCurrency(suggestion.amount)}`;
    }
    if (suggestion.type === "Delay Goal") {
      return `Delay by ${Number(suggestion.years || 0)} year(s)`;
    }
    if (suggestion.type === "Increase Expected Return") {
      return `Raise return target to ${Number(suggestion.targetReturnRate || 0).toFixed(2)}%`;
    }
    if (suggestion.type === "Goal Year Reached") {
      return suggestion.message || "Target year reached";
    }
    return "Review recovery options";
  };

  const distribution = useMemo(() => (
    Array.isArray(summary?.distribution) ? summary.distribution : []
  ), [summary]);

  const totalDistributionValue = distribution.reduce((sum, row) => sum + Number(row.value || 0), 0);

  const pieChartStyle = useMemo(() => {
    if (!totalDistributionValue) {
      return { background: "#E5E7EB" };
    }

    let angleCursor = 0;
    const segments = distribution.map((row) => {
      const value = Number(row.value || 0);
      const angle = (value / totalDistributionValue) * 360;
      const start = angleCursor;
      const end = angleCursor + angle;
      angleCursor = end;
      const color = chartColors[row.category] || chartColors.Other;
      return `${color} ${start}deg ${end}deg`;
    });

    return {
      background: `conic-gradient(${segments.join(", ")})`
    };
  }, [distribution, totalDistributionValue]);

  const cards = [
    {
      title: "Net Worth",
      value: formatCurrency(summary?.totalNetWorth)
    },
    {
      title: "Financial Assets",
      value: formatCurrency(summary?.financialAssetsValue)
    },
    {
      title: "Real Assets",
      value: formatCurrency(summary?.assetValue)
    },
    {
      title: "Liquidity Ratio",
      value: `${(Number(summary?.liquidityRatio || 0) * 100).toFixed(2)}%`
    }
  ];

  const atRiskGoals = goalIntelligence.filter((goal) => goal.status === "At Risk");
  const driftRows = useMemo(() => {
    const rows = Array.isArray(allocationSummary?.driftAnalysis) ? allocationSummary.driftAnalysis : [];
    return [...rows].sort((left, right) => Math.abs(Number(right.drift || 0)) - Math.abs(Number(left.drift || 0)));
  }, [allocationSummary?.driftAnalysis]);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6]">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
          Net Worth Intelligence across financial and real-world assets.
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

      {isLoading ? <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Loading dashboard intelligence...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="app-surface-card p-4 transition-all duration-200 ease-out hover:-translate-y-[2px] sm:p-6">
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{card.title}</p>
            <p className="mt-2 min-h-10 text-2xl font-semibold text-gray-900 dark:text-[#F3F4F6]">{card.value}</p>
          </article>
        ))}
      </div>

      <article className="app-surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F3F4F6]">Wealth Distribution</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">Category-wise distribution of total wealth.</p>
          </div>

          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative mx-auto h-44 w-44 rounded-full" style={pieChartStyle}>
              <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-[#0F141A]" />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              {distribution.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">No wealth data available yet.</p>
              ) : distribution.map((row) => {
                const percent = totalDistributionValue > 0
                  ? (Number(row.value || 0) / totalDistributionValue) * 100
                  : 0;

                return (
                  <div key={row.category} className="rounded-xl border border-brand-line p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: chartColors[row.category] || chartColors.Other }}
                      />
                      <p className="text-sm font-medium text-gray-800 dark:text-[#E5E7EB]">{row.category}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">{formatCurrency(row.value)} | {percent.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </article>

      <article className="app-surface-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F3F4F6]">Allocation Drift</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">Target vs actual allocation with rebalance actions.</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-[#9CA3AF]">
          Total financial allocation base: {formatCurrency(allocationSummary?.totalFinancialValue)}
        </p>

        {!driftRows.length ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-[#9CA3AF]">No allocation data available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="fo-table">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Target</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Actual</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Drift</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="fo-table-body">
                {driftRows.map((item) => {
                  const drift = Number(item.drift || 0);
                  const isOverweight = drift > 0.01;
                  const isUnderweight = drift < -0.01;
                  const actionText = isOverweight
                    ? `Reduce by ${formatCurrency(Math.abs(item.driftAmount || 0))}`
                    : isUnderweight
                      ? `Increase by ${formatCurrency(Math.abs(item.driftAmount || 0))}`
                      : "On target";
                  const driftClassName = isOverweight
                    ? "text-rose-600"
                    : isUnderweight
                      ? "text-emerald-600"
                      : "text-gray-600";
                  const actionClassName = isOverweight
                    ? "text-rose-700"
                    : isUnderweight
                      ? "text-emerald-700"
                      : "text-gray-700";

                  return (
                    <tr key={item.category}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                        {formatPercent(item.target)} ({formatCurrency(item.targetAmount)})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
                        {formatPercent(item.actual)} ({formatCurrency(item.actualAmount)})
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${driftClassName}`}>
                        {drift >= 0 ? "+" : ""}{formatPercent(drift)} ({drift >= 0 ? "+" : ""}{formatCurrency(item.driftAmount)})
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${actionClassName}`}>{actionText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {allocationSummary?.rebalanceSuggestions?.length ? (
          <div className="mt-4 rounded-xl border border-brand-line p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">Rebalance Suggestions</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {allocationSummary.rebalanceSuggestions.map((suggestion) => (
                <p key={`${suggestion.category}-${suggestion.action}`} className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                  {suggestion.action} {suggestion.category} by {formatCurrency(suggestion.amount)}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <article className="app-surface-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F3F4F6]">Goal Intelligence</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">Goal status and risk alerts across your plan.</p>

        {!goalIntelligence.length ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-[#9CA3AF]">No goals found yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {goalIntelligence.map((goal) => (
              <div key={goal.goalId} className="rounded-xl border border-brand-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-gray-900 dark:text-[#F3F4F6]">{goal.goalName}</p>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                    goal.status === "Goal Met"
                      ? "bg-emerald-100 text-emerald-700"
                      : goal.status === "On Track"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-rose-100 text-rose-700"
                  }`}>
                    {goal.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#111827]">
                    <p className="text-gray-500 dark:text-[#9CA3AF]">Future Required</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{formatCurrency(goal.futureRequired)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#111827]">
                    <p className="text-gray-500 dark:text-[#9CA3AF]">Projected Corpus</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{formatCurrency(goal.projectedCorpus)}</p>
                  </div>
                </div>

                <p className={`mt-3 text-sm font-semibold ${goal.gap >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  Gap: {formatCurrency(goal.gap)}
                </p>

                <div className="mt-3">
                  <Link
                    to={`/goals/${goal.goalId}`}
                    className="inline-flex items-center rounded-md border border-brand-line px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-slate-50 dark:text-[#E5E7EB] dark:hover:bg-[#111827]"
                  >
                    View Goal Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {atRiskGoals.length ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-700">Risk Alerts</p>
            <div className="mt-2 space-y-2">
              {atRiskGoals.map((goal) => (
                <p key={`risk-${goal.goalId}`} className="text-sm text-rose-700">
                  {goal.goalName}: {formatRecoverySuggestion(goal.recoverySuggestions?.[0])}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <article className="app-surface-card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F3F4F6]">Opportunity Engine</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">Simulate a market crash and pre-plan opportunity fund deployment.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={handleOpportunityEvaluate}>
          <label className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-[#9CA3AF]">Market drop %</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="marketDropPercent"
              value={opportunityForm.marketDropPercent}
              onChange={handleOpportunityChange}
              required
              className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-[#9CA3AF]">Opportunity fund value</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="opportunityFundValue"
              value={opportunityForm.opportunityFundValue}
              onChange={handleOpportunityChange}
              required
              className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isEvaluatingOpportunity}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isEvaluatingOpportunity ? "Evaluating..." : "Evaluate"}
            </button>
          </div>
        </form>

        {opportunityError ? <p className="mt-3 text-sm font-medium text-rose-600">{opportunityError}</p> : null}

        {opportunityResult ? (
          <div className="mt-4 rounded-xl border border-brand-line p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
              Deploy {formatCurrency(opportunityResult.deployAmount)} ({(Number(opportunityResult.deployPercent || 0) * 100).toFixed(0)}%)
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(opportunityResult.allocation || []).map((item) => (
                <div key={item.instrument} className="rounded-lg border border-brand-line p-2">
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{item.instrument}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      {reconnectToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:border-[#1F2937] dark:bg-green-900/25 dark:text-green-400 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          {reconnectToast}
        </div>
      ) : null}
    </section>
  );
}

export default DashboardPage;
