const TransactionsTable = ({ transactions = [] }) => {
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
            {transactions.map((tx) => (
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
    </section>
  );
};

export default TransactionsTable;