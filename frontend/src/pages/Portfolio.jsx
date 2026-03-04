import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MetricCard from "../components/MetricCard";
import { useBackupStatus } from "../hooks/useBackupStatus";
import api from "../services/api";

function PortfolioPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [instrumentSort, setInstrumentSort] = useState({ key: "value", direction: "desc" });
  const [brokerSort, setBrokerSort] = useState({ key: "value", direction: "desc" });
  const [topHoldingSort, setTopHoldingSort] = useState({ key: "value", direction: "desc" });
  const { health, lastBackupText } = useBackupStatus();

  const fetchSummary = async () => {
    const response = await api.get("/portfolio/summary");
    setSummary(response.data);
  };

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setError("");
        await fetchSummary();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load portfolio summary");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, []);

  const formatCurrency = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
  const toggleSort = (currentSort, setSort, key) => {
    setSort((state) => {
      if (state.key === key) {
        return { key, direction: state.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortRows = (rows, sortConfig) => {
    const sorted = [...rows].sort((left, right) => {
      const leftValue = left[sortConfig.key];
      const rightValue = right[sortConfig.key];

      if (typeof leftValue === "string" || typeof rightValue === "string") {
        return String(leftValue || "").localeCompare(String(rightValue || ""), undefined, { sensitivity: "base" });
      }

      return Number(leftValue || 0) - Number(rightValue || 0);
    });

    return sortConfig.direction === "asc" ? sorted : sorted.reverse();
  };

  const sortedInstrumentRows = useMemo(
    () => sortRows(summary?.allocationByInstrumentType || [], instrumentSort),
    [summary?.allocationByInstrumentType, instrumentSort]
  );

  const sortedBrokerRows = useMemo(
    () => sortRows(summary?.allocationByBroker || [], brokerSort),
    [summary?.allocationByBroker, brokerSort]
  );

  const sortedTopHoldings = useMemo(
    () => sortRows(summary?.topHoldings || [], topHoldingSort),
    [summary?.topHoldings, topHoldingSort]
  );

  const sortIndicator = (config, key) => (config.key === key ? (config.direction === "asc" ? " ▲" : " ▼") : "");

  const heroCards = [
    {
      label: "Net Worth",
      value: formatCurrency(summary?.netWorth)
    },
    {
      label: "Total Invested",
      value: formatCurrency(summary?.totalInvested)
    },
    {
      label: "Total Profit",
      value: formatCurrency(summary?.totalProfit),
      helper: formatPercent(summary?.totalProfitPercent),
      valueClassName: Number(summary?.totalProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
    }
  ];

  const assetTotalCards = [
    {
      label: "Market Holdings",
      value: formatCurrency(summary?.totalMarketValue)
    },
    {
      label: "Fixed Deposits",
      value: formatCurrency(summary?.totalFDValue)
    },
    {
      label: "EPF",
      value: formatCurrency(summary?.totalEpfValue)
    },
    {
      label: "NPS",
      value: formatCurrency(summary?.totalNpsValue)
    },
    {
      label: "PPF",
      value: formatCurrency(summary?.totalPpfValue)
    },
    {
      label: "Physical Commodity",
      value: formatCurrency(summary?.totalCommodityValue)
    },
    {
      label: "Cash",
      value: formatCurrency(summary?.totalCashValue)
    }
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Portfolio Intelligence</h2>
        <p className="mt-1 text-sm text-gray-500">Allocation drilldown across brokers, types, and top positions.</p>
        <p className="mt-1 text-xs text-gray-400">{lastBackupText}</p>
      </div>

      {health ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
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

      {isLoading ? <p className="mt-8 text-sm text-brand-muted">Loading portfolio summary...</p> : null}
      {error ? <p className="mt-8 text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && !error && summary ? (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {heroCards.map((card) => (
              <MetricCard key={card.label} variant="hero" {...card} />
            ))}
          </div>

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-brand-text">Asset Totals</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {assetTotalCards.map((card) => (
                <MetricCard key={card.label} variant="compact" {...card} />
              ))}
            </div>
          </div>

          <div className="app-divider pt-3 text-sm text-gray-600">
            <span>Total Holdings: {Number(summary?.totalHoldings || 0).toLocaleString("en-IN")}</span>
            <span className="mx-3 text-gray-300">|</span>
            <span>Unassigned Capital: {formatPercent(summary?.unassignedPercent)}</span>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
              <div className="border-b border-brand-line px-5 py-4">
                <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocation by Instrument Type</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="fo-table">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(instrumentSort, setInstrumentSort, "name")} className="font-semibold">Type{sortIndicator(instrumentSort, "name")}</button></th>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(instrumentSort, setInstrumentSort, "value")} className="font-semibold">Value{sortIndicator(instrumentSort, "value")}</button></th>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(instrumentSort, setInstrumentSort, "percentOfNetWorth")} className="font-semibold">% of Net Worth{sortIndicator(instrumentSort, "percentOfNetWorth")}</button></th>
                    </tr>
                  </thead>
                  <tbody className="fo-table-body">
                    {sortedInstrumentRows.map((row) => (
                      <tr key={row.name}>
                        <td className="px-5 py-3 text-brand-text">{row.displayName || row.name}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(row.value)}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatPercent(row.percentOfNetWorth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
              <div className="border-b border-brand-line px-5 py-4">
                <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocation by Broker</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="fo-table">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(brokerSort, setBrokerSort, "name")} className="font-semibold">Broker{sortIndicator(brokerSort, "name")}</button></th>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(brokerSort, setBrokerSort, "value")} className="font-semibold">Value{sortIndicator(brokerSort, "value")}</button></th>
                      <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(brokerSort, setBrokerSort, "percentOfNetWorth")} className="font-semibold">% of Net Worth{sortIndicator(brokerSort, "percentOfNetWorth")}</button></th>
                    </tr>
                  </thead>
                  <tbody className="fo-table-body">
                    {sortedBrokerRows.map((row) => (
                      <tr key={row.name}>
                        <td className="px-5 py-3 text-brand-text">{row.displayName || row.name}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(row.value)}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatPercent(row.percentOfNetWorth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <article className="mt-8 overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
            <div className="border-b border-brand-line px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight text-brand-text">Top Assets</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="fo-table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "instrumentName")} className="font-semibold">Instrument{sortIndicator(topHoldingSort, "instrumentName")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "broker")} className="font-semibold">Broker{sortIndicator(topHoldingSort, "broker")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "instrumentType")} className="font-semibold">Type{sortIndicator(topHoldingSort, "instrumentType")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "quantity")} className="font-semibold">Quantity{sortIndicator(topHoldingSort, "quantity")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "averagePrice")} className="font-semibold">Avg Price{sortIndicator(topHoldingSort, "averagePrice")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "currentPrice")} className="font-semibold">Current Price{sortIndicator(topHoldingSort, "currentPrice")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "investedValue")} className="font-semibold">Invested Value{sortIndicator(topHoldingSort, "investedValue")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "value")} className="font-semibold">Value{sortIndicator(topHoldingSort, "value")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "profit")} className="font-semibold">Profit{sortIndicator(topHoldingSort, "profit")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "profitPercent")} className="font-semibold">Return %{sortIndicator(topHoldingSort, "profitPercent")}</button></th>
                    <th className="px-5 py-3 font-semibold text-brand-text"><button type="button" onClick={() => toggleSort(topHoldingSort, setTopHoldingSort, "percentOfNetWorth")} className="font-semibold">% of Net Worth{sortIndicator(topHoldingSort, "percentOfNetWorth")}</button></th>
                  </tr>
                </thead>
                <tbody className="fo-table-body">
                  {sortedTopHoldings.map((holding) => {
                    const profitClassName = Number(holding.profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600";

                    return (
                      <tr key={holding._id}>
                        <td className="px-5 py-3 text-brand-text">{holding.instrumentName}</td>
                        <td className="px-5 py-3 text-brand-muted">{holding.brokerDisplayName || holding.broker}</td>
                        <td className="px-5 py-3 text-brand-muted">{holding.instrumentType}</td>
                        <td className="px-5 py-3 text-brand-muted">{holding.quantity}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.averagePrice)}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.currentPrice)}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.investedValue)}</td>
                        <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(holding.value)}</td>
                        <td className={`px-5 py-3 font-semibold ${profitClassName}`}>{formatCurrency(holding.profit)}</td>
                        <td className={`px-5 py-3 font-semibold ${profitClassName}`}>{formatPercent(holding.profitPercent)}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatPercent(holding.percentOfNetWorth)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}

export default PortfolioPage;

