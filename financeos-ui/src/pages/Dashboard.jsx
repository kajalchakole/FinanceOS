import { useEffect, useMemo, useState } from "react";
import { getPortfolioSummary, getPositions, getTransactions } from "../api/client";
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

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setErrors([]);

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
          symbol: position.symbol || position.isin || "-",
          quantity: Number(position.remainingQty || 0),
          avgPrice: currency.format(Number(position.avgCost || 0)),
          ltp: currency.format(Number(position.currentPrice || 0)),
          pnl: currency.format(Number(position.unrealizedPnL || 0)),
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
            date: tx.transactionDate ? new Date(tx.transactionDate).toISOString().slice(0, 10) : "-",
            type: tx.transactionType || "-",
            symbol: tx.symbol || tx.isin || "-",
            quantity: Number(tx.quantity || 0),
            price: currency.format(Number(tx.price || 0)),
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
  }, []);

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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <p className="font-medium">Some dashboard data could not be loaded.</p>
          <ul className="mt-1 list-disc pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
    </main>
  );
};

export default Dashboard;
