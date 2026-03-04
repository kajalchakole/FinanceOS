import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

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
import CashAccountsPage from "./pages/CashAccountsPage";
import GoalDetailPage from "./pages/GoalDetail";
import GoalsPage from "./pages/Goals";
import HoldingsPage from "./pages/Holdings";
import PortfolioPage from "./pages/Portfolio";
import SecurityPage from "./pages/Security";
import SetupAuthPage from "./pages/SetupAuth";
import SettingsPage from "./pages/Settings";
import { authApi, settingsApi } from "./services/api";

const LOCKED_STORAGE_KEY = "financeos_locked";
const DEFAULT_AUTO_LOCK_MINUTES = 10;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    loading: true,
    hasUser: false,
    isAuthenticated: false
  });
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState(DEFAULT_AUTO_LOCK_MINUTES);
  const [lockToast, setLockToast] = useState("");

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

  useEffect(() => {
    if (!status.isAuthenticated) {
      return undefined;
    }

    let active = true;

    const fetchSecuritySettings = async () => {
      try {
        const response = await settingsApi.get();
        if (!active) {
          return;
        }

        const nextEnabled = Boolean(response.data?.sessionAutoLockEnabled ?? true);
        const nextMinutes = Number(response.data?.sessionAutoLockMinutes);

        setAutoLockEnabled(nextEnabled);
        setAutoLockMinutes(Number.isInteger(nextMinutes) && nextMinutes >= 1 && nextMinutes <= 240
          ? nextMinutes
          : DEFAULT_AUTO_LOCK_MINUTES);
      } catch {
        if (!active) {
          return;
        }
        setAutoLockEnabled(true);
        setAutoLockMinutes(DEFAULT_AUTO_LOCK_MINUTES);
      }
    };

    fetchSecuritySettings();

    return () => {
      active = false;
    };
  }, [status.isAuthenticated]);

  useEffect(() => {
    const handleUnlockEvent = () => {
      localStorage.removeItem(LOCKED_STORAGE_KEY);
    };

    window.addEventListener("financeos:unlock", handleUnlockEvent);

    return () => {
      window.removeEventListener("financeos:unlock", handleUnlockEvent);
    };
  }, []);

  useEffect(() => {
    if (!status.isAuthenticated || !autoLockEnabled) {
      return undefined;
    }

    if (location.pathname === "/auth" || location.pathname === "/setup-auth") {
      return undefined;
    }

    const timeoutMs = autoLockMinutes * 60 * 1000;
    let timeoutId = null;

    const lockSession = () => {
      localStorage.setItem(LOCKED_STORAGE_KEY, "true");
      setLockToast("Locked due to inactivity");
      navigate("/auth", { replace: true });
    };

    const resetTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(lockSession, timeoutMs);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [autoLockEnabled, autoLockMinutes, location.pathname, navigate, status.isAuthenticated]);

  useEffect(() => {
    if (!lockToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLockToast("");
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [lockToast]);

  const redirectPath = useMemo(() => {
    const pathname = location.pathname;
    const isSetupRoute = pathname === "/setup-auth";
    const isAuthRoute = pathname === "/auth";
    const isLocked = localStorage.getItem(LOCKED_STORAGE_KEY) === "true";

    if (!status.hasUser) {
      return isSetupRoute ? null : "/setup-auth";
    }

    if (!status.isAuthenticated) {
      return isAuthRoute ? null : "/auth";
    }

    if (isLocked && !isAuthRoute) {
      return "/auth";
    }

    if (isSetupRoute || (isAuthRoute && !isLocked)) {
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
    <>
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
          <Route path="/cash-accounts" element={<CashAccountsPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {lockToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-soft">
          {lockToast}
        </div>
      ) : null}
    </>
  );
}

export default App;
