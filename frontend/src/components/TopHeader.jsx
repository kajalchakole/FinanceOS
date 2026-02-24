import React from "react";

import { usePortfolio } from "../context/PortfolioContext";
import SyncStatus from "./SyncStatus";

function TopHeader() {
  const { netWorth } = usePortfolio();

  const formattedNetWorth = `\u20B9${Number(netWorth || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  return (
    <header className="border-b border-brand-line bg-brand-panel px-6 py-5 shadow-soft sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-brand-text">FinanceOS</h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-brand-line bg-white px-4 py-2 text-sm text-brand-muted">
            Net Worth: <span className="font-semibold text-brand-text">{formattedNetWorth}</span>
          </div>

          <SyncStatus />
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
