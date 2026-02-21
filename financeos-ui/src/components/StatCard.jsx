const StatCard = ({ title, value, change, positive = true }) => {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      <p className={`mt-3 text-sm font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
        {change}
      </p>
    </article>
  );
};

export default StatCard;