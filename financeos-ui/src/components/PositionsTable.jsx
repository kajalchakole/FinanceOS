const PositionsTable = ({ positions = [] }) => {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Positions</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="pb-3 font-medium">Symbol</th>
              <th className="pb-3 font-medium">Quantity</th>
              <th className="pb-3 font-medium">Avg Price</th>
              <th className="pb-3 font-medium">LTP</th>
              <th className="pb-3 font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.symbol} className="border-b border-slate-800/70 text-slate-200">
                <td className="py-3 font-medium">{position.symbol}</td>
                <td className="py-3">{position.quantity}</td>
                <td className="py-3">{position.avgPrice}</td>
                <td className="py-3">{position.ltp}</td>
                <td className={`py-3 ${String(position.pnl).startsWith("-") ? "text-rose-400" : "text-emerald-400"}`}>
                  {position.pnl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PositionsTable;
