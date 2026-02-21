const StatCard = ({ title, value, change, changeType = "positive" }) => {
  const isPositive = changeType === "positive";

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md shadow-black/20 sm:p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100 sm:text-3xl">{value}</p>
      {change ? (
        <p className={`mt-3 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
          {change}
        </p>
      ) : null}
    </article>
  );
};

export default StatCard;
