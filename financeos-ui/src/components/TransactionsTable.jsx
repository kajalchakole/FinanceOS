import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 8;
const CURRENCY_CODE = import.meta.env.VITE_CURRENCY || "INR";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 4,
});

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TransactionsTable = ({ transactions = [], loading = false }) => {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return transactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [page, transactions]);

  const skeletonRows = Array.from({ length: PAGE_SIZE });

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Recent Transactions</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="pb-3 pr-4 font-medium">Date</th>
              <th className="pb-3 pr-4 font-medium">Instrument</th>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 text-right font-medium">Quantity</th>
              <th className="hidden pb-3 pr-4 text-right font-medium sm:table-cell">Price</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((_, index) => (
                  <tr key={`tx-skeleton-${index}`} className="border-b border-slate-800/70">
                    <td className="py-2 pr-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <div className="h-4 w-10 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="hidden py-2 pr-4 text-right sm:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-2 text-right">
                      <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              : pagedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="py-2 pr-4 font-medium">{tx.instrument}</td>
                    <td className={`py-2 pr-4 font-medium ${tx.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type}
                    </td>
                    <td className="py-2 pr-4 text-right">{quantityFormatter.format(Number(tx.quantity || 0))}</td>
                    <td className="hidden py-2 pr-4 text-right sm:table-cell">
                      {priceFormatter.format(Number(tx.price || 0))}
                    </td>
                    <td className="py-2 text-right font-medium">{priceFormatter.format(Number(tx.amount || 0))}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && transactions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No transactions found.</p>
      ) : null}
      {!loading && transactions.length > 0 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              type="button"
            >
              Previous
            </button>
            <button
              className="rounded border border-slate-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default TransactionsTable;
