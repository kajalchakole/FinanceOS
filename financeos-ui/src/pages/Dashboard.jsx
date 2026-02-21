import { useEffect, useMemo, useState } from "react";
import { getPortfolioSummary, getPositions, getTransactions } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
import PositionsTable from "../components/PositionsTable";
import TransactionsTable from "../components/TransactionsTable";

const CURRENCY_CODE = import.meta.env.VITE_CURRENCY || "INR";
const LOCALE = import.meta.env.VITE_LOCALE || "en-US";

function createCurrencyFormatter(locale, currencyCode) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    });
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }
}

const currency = createCurrencyFormatter(LOCALE, CURRENCY_CODE);

const percent = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatInstrumentType(type) {
  const normalized = String(type || "").trim().toUpperCase();

  if (normalized === "EQUITY" || normalized === "STOCK") {
    return "Equity";
  }

  if (normalized === "MF" || normalized === "MUTUAL_FUND" || normalized === "MUTUAL FUND") {
    return "MF";
  }

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .toLowerCase()
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setErrors([]);
      setSummary(null);
      setPositions([]);
      setTransactions([]);

      const [portfolioRes, positionsRes, transactionsRes] = await Promise.allSettled([
        getPortfolioSummary(),
        getPositions(),
        getTransactions(),
      ]);

      if (!active) {
        return;
      }

      const nextErrors = [];

      if (portfolioRes.status === "fulfilled") {
        const portfolioData = portfolioRes.value?.data || {};
        setSummary(portfolioData.totals || {});
      } else {
        nextErrors.push(`Portfolio summary: ${portfolioRes.reason?.message || "Failed to load"}`);
      }

      if (positionsRes.status === "fulfilled") {
        const positionRows = (positionsRes.value?.data || []).map((position) => ({
          id: position.isin,
          instrumentName: position.symbol || position.isin || "-",
          type: formatInstrumentType(position.instrumentType),
          quantity: Number(position.remainingQty || 0),
          avgPrice: Number(position.avgCost || 0),
          currentPrice: Number(position.currentPrice || 0),
          marketValue: Number(position.marketValue || 0),
          gainLoss: Number(position.unrealizedPnL || 0),
        }));
        setPositions(positionRows);
      } else {
        nextErrors.push(`Positions: ${positionsRes.reason?.message || "Failed to load"}`);
      }

      if (transactionsRes.status === "fulfilled") {
        const txRows = (transactionsRes.value?.data || [])
          .slice()
          .reverse()
          .map((tx) => ({
            id: tx._id || `${tx.isin}-${tx.transactionDate}`,
            date: tx.transactionDate || "",
            instrument: tx.symbol || tx.isin || "-",
            type: tx.transactionType || "-",
            quantity: Number(tx.quantity || 0),
            price: Number(tx.price || 0),
            amount: Number(tx.quantity || 0) * Number(tx.price || 0) + Number(tx.charges || 0),
          }));
        setTransactions(txRows);
      } else {
        nextErrors.push(`Transactions: ${transactionsRes.reason?.message || "Failed to load"}`);
      }

      setErrors(nextErrors);
      setLoading(false);
    };

    loadDashboard().catch((err) => {
      if (!active) {
        return;
      }
      setErrors([err?.message || "Failed to load dashboard data"]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [refreshTick]);

  const stats = useMemo(() => {
    const totalMarketValue = Number(summary?.totalMarketValue || 0);
    const totalInvested = Number(summary?.totalInvested || 0);
    const totalUnrealizedPnL = Number(summary?.totalUnrealizedPnL || 0);
    const totalUnrealizedPnLPercent = Number(summary?.totalUnrealizedPnLPercent || 0);

    return [
      {
        title: "Total Portfolio Value",
        value: currency.format(totalMarketValue),
        change: `${positions.length} holdings`,
        changeType: totalUnrealizedPnLPercent >= 0 ? "positive" : "negative",
      },
      {
        title: "Total Invested",
        value: currency.format(totalInvested),
        change: positions.length ? `${positions.length} active positions` : "No active positions",
        changeType: "positive",
      },
      {
        title: "Total Gain/Loss",
        value: currency.format(totalUnrealizedPnL),
        change: `${totalUnrealizedPnLPercent >= 0 ? "+" : ""}${percent.format(totalUnrealizedPnLPercent)}%`,
        changeType: totalUnrealizedPnL >= 0 ? "positive" : "negative",
      },
    ];
  }, [positions.length, summary]);

  const hasData = Boolean(summary) || positions.length > 0 || transactions.length > 0;
  const isCriticalError = !loading && errors.length >= 3 && !hasData;
  const isEmptyState = !loading && !isCriticalError && !hasData;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      {loading ? <LoadingSpinner label="Syncing latest holdings..." /> : null}

      {isCriticalError ? (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <h2 className="text-lg font-semibold text-rose-200">Unable to load dashboard</h2>
          <p className="mt-2 text-sm">Please check your API connection and try again.</p>
          <button
            type="button"
            onClick={() => setRefreshTick((prev) => prev + 1)}
            className="mt-4 rounded-md border border-rose-300/40 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20"
          >
            Retry
          </button>
        </section>
      ) : null}

      {errors.length > 0 && !isCriticalError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <p className="font-medium">Some dashboard data could not be loaded.</p>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isEmptyState ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-100">No portfolio activity yet</h2>
          <p className="mt-2 text-sm text-slate-400">Import transactions to start tracking positions and performance.</p>
          <button
            type="button"
            onClick={() => setRefreshTick((prev) => prev + 1)}
            className="mt-4 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </section>
      ) : null}

      {isCriticalError ? null : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <article
                    key={`stat-skeleton-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20"
                  >
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
                    <div className="mt-3 h-8 w-40 animate-pulse rounded bg-slate-800" />
                    <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-800" />
                  </article>
                ))
              : stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
          </section>
          <section className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <PositionsTable positions={positions} loading={loading} />
            </div>
            <div className="xl:col-span-2">
              <TransactionsTable transactions={transactions} loading={loading} />
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default Dashboard;
