import { useEffect, useMemo, useState } from "react";
import client from "../api/client";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [portfolioRes, positionsRes, transactionsRes] = await Promise.all([
          client.get("/portfolio"),
          client.get("/positions"),
          client.get("/transactions"),
        ]);

        if (!active) {
          return;
        }

        const portfolioData = portfolioRes?.data?.data || {};
        const totals = portfolioData.totals || {};
        const positionRows = (positionsRes?.data?.data || []).map((position) => ({
          symbol: position.symbol || position.isin || "-",
          quantity: Number(position.remainingQty || 0),
          avgPrice: currency.format(Number(position.avgCost || 0)),
          ltp: currency.format(Number(position.currentPrice || 0)),
          pnl: currency.format(Number(position.unrealizedPnL || 0)),
        }));
        const txRows = (transactionsRes?.data?.data || [])
          .slice()
          .reverse()
          .slice(0, 10)
          .map((tx) => ({
            id: tx._id || `${tx.isin}-${tx.transactionDate}`,
            date: tx.transactionDate ? new Date(tx.transactionDate).toISOString().slice(0, 10) : "-",
            type: tx.transactionType || "-",
            symbol: tx.symbol || tx.isin || "-",
            quantity: Number(tx.quantity || 0),
            price: currency.format(Number(tx.price || 0)),
          }));

        setSummary(totals);
        setPositions(positionRows);
        setTransactions(txRows);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.response?.data?.message || err?.message || "Failed to load dashboard data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

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
        title: "Portfolio Value",
        value: currency.format(totalMarketValue),
        change: `${totalUnrealizedPnLPercent >= 0 ? "+" : ""}${percent.format(totalUnrealizedPnLPercent)}%`,
        positive: totalUnrealizedPnLPercent >= 0,
      },
      {
        title: "Unrealized P/L",
        value: currency.format(totalUnrealizedPnL),
        change: totalUnrealizedPnL >= 0 ? "Profit" : "Loss",
        positive: totalUnrealizedPnL >= 0,
      },
      {
        title: "Invested",
        value: currency.format(totalInvested),
        change: positions.length ? `${positions.length} active positions` : "No active positions",
        positive: true,
      },
    ];
  }, [positions.length, summary]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <PositionsTable positions={positions} />
        </div>
        <div className="xl:col-span-2">
          <TransactionsTable transactions={transactions} />
        </div>
      </section>
      {loading ? <p className="text-sm text-slate-400">Loading latest portfolio data...</p> : null}
    </main>
  );
};

export default Dashboard;
