import React from "react";
import { useNavigate } from "react-router-dom";

import { usePortfolio } from "../context/PortfolioContext";
import { authApi } from "../services/api";
import SyncStatus from "./SyncStatus";
import ThemeToggle from "./ThemeToggle";

function TopHeader() {
  const navigate = useNavigate();
  const { netWorth } = usePortfolio();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  const formattedNetWorth = `\u20B9${Number(netWorth || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-colors duration-300 ease-out dark:border-[#1F2937] dark:bg-[#0F141A] dark:shadow-none sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-[#F3F4F6]">FinanceOS</h1>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-colors duration-300 ease-out dark:border-[#1F2937] dark:bg-[#161D26] dark:text-[#F3F4F6] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            Net Worth: <span className="text-indigo-600">{formattedNetWorth}</span>
          </div>

          <SyncStatus />
          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-all duration-200 ease-out hover:bg-gray-100 hover:text-gray-900 dark:text-[#9CA3AF] dark:hover:bg-[#161D26] dark:hover:text-[#F3F4F6]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3h2.25A1.5 1.5 0 0 1 19.5 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-2.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 16.5 15 12l-4.5-4.5M15 12H4.5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
