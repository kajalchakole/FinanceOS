import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api from "../services/api";

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [netWorth, setNetWorth] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPortfolio = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [holdingsResponse, goalsResponse, dashboardResponse] = await Promise.all([
        api.get("/holdings"),
        api.get("/goals"),
        api.get("/dashboard")
      ]);

      const payload = {
        holdings: holdingsResponse.data || [],
        goals: goalsResponse.data || [],
        dashboard: dashboardResponse.data || {}
      };

      setNetWorth(payload.dashboard?.netWorth || 0);
      window.dispatchEvent(new CustomEvent("portfolio:refreshed", { detail: payload }));

      return payload;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshPortfolio().catch(() => {
      setNetWorth(0);
    });
  }, [refreshPortfolio]);

  useEffect(() => {
    const handleDashboardRefresh = () => {
      refreshPortfolio().catch(() => {
        setNetWorth(0);
      });
    };

    window.addEventListener("dashboard:refresh", handleDashboardRefresh);

    return () => {
      window.removeEventListener("dashboard:refresh", handleDashboardRefresh);
    };
  }, [refreshPortfolio]);

  const contextValue = useMemo(() => ({
    netWorth,
    isRefreshing,
    refreshPortfolio
  }), [isRefreshing, netWorth, refreshPortfolio]);

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }

  return context;
};
