const StatCard = ({ title, value, change, changeType = "positive" }) => {
  const isPositive = changeType === "positive";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">{value}</p>
      {change ? (
        <p className={`mt-3 text-sm font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {change}
        </p>
      ) : null}
    </article>
  );
};

export default StatCard;
