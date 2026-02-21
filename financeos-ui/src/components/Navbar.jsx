const Navbar = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">FinanceOS</p>
          <h1 className="text-lg font-semibold text-slate-100">Portfolio Dashboard</h1>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Live
        </span>
      </div>
    </header>
  );
};

export default Navbar;