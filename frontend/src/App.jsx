import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { PortfolioProvider } from "./context/PortfolioContext";
import AppLayout from "./layout/AppLayout";
import AddHoldingPage from "./pages/AddHolding";
import AuthPage from "./pages/Auth";
import CreateGoalPage from "./pages/CreateGoal";
import DashboardPage from "./pages/Dashboard";
import FixedDepositsPage from "./pages/FixedDeposits";
import EPFPage from "./pages/EPF";
import NPSPage from "./pages/NPS";
import PPFPage from "./pages/PPF";
import PhysicalCommoditiesPage from "./pages/PhysicalCommodities";
import GoalDetailPage from "./pages/GoalDetail";
import GoalsPage from "./pages/Goals";
import HoldingsPage from "./pages/Holdings";
import PortfolioPage from "./pages/Portfolio";
import SetupAuthPage from "./pages/SetupAuth";
import SettingsPage from "./pages/Settings";
import { authApi } from "./services/api";

function App() {
  const location = useLocation();
  const [status, setStatus] = useState({
    loading: true,
    hasUser: false,
    isAuthenticated: false
  });

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      setStatus((previousState) => ({
        ...previousState,
        loading: true
      }));

      try {
        const response = await authApi.status();
        if (!active) {
          return;
        }

        setStatus({
          loading: false,
          hasUser: Boolean(response.data?.hasUser),
          isAuthenticated: Boolean(response.data?.isAuthenticated)
        });
      } catch {
        if (!active) {
          return;
        }

        setStatus((previousState) => ({
          ...previousState,
          loading: false,
          hasUser: true,
          isAuthenticated: false
        }));
      }
    };

    fetchStatus();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const redirectPath = useMemo(() => {
    const pathname = location.pathname;
    const isSetupRoute = pathname === "/setup-auth";
    const isAuthRoute = pathname === "/auth";

    if (!status.hasUser) {
      return isSetupRoute ? null : "/setup-auth";
    }

    if (!status.isAuthenticated) {
      return isAuthRoute ? null : "/auth";
    }

    if (isSetupRoute || isAuthRoute) {
      return "/portfolio";
    }

    return null;
  }, [location.pathname, status.hasUser, status.isAuthenticated]);

  if (status.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <p className="text-sm text-brand-muted">Checking authentication...</p>
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <Routes>
      <Route path="/setup-auth" element={<SetupAuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={(
          <PortfolioProvider>
            <AppLayout />
          </PortfolioProvider>
        )}
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:id" element={<GoalDetailPage />} />
        <Route path="/goals/new" element={<CreateGoalPage />} />
        <Route path="/goals/:id/edit" element={<CreateGoalPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/holdings/new" element={<AddHoldingPage />} />
        <Route path="/holdings/:id/edit" element={<AddHoldingPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/fixed-deposits" element={<FixedDepositsPage />} />
        <Route path="/epf" element={<EPFPage />} />
        <Route path="/nps" element={<NPSPage />} />
        <Route path="/ppf" element={<PPFPage />} />
        <Route path="/physical-commodities" element={<PhysicalCommoditiesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
