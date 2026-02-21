import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 8;

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
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Symbol</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((_, index) => (
                  <tr key={`tx-skeleton-${index}`} className="border-b border-slate-800/70">
                    <td className="py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-14 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-10 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              : pagedTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="py-3">{tx.date}</td>
                    <td className={`py-3 font-medium ${tx.type === "BUY" ? "text-emerald-400" : "text-amber-400"}`}>
                      {tx.type}
                    </td>
                    <td className="py-3">{tx.symbol}</td>
                    <td className="py-3">{tx.quantity}</td>
                    <td className="py-3">{tx.price}</td>
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
