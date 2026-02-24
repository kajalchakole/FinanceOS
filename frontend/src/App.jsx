import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PortfolioProvider } from "./context/PortfolioContext";
import AppLayout from "./layout/AppLayout";
import AddHoldingPage from "./pages/AddHolding";
import CreateGoalPage from "./pages/CreateGoal";
import DashboardPage from "./pages/Dashboard";
import GoalDetailPage from "./pages/GoalDetail";
import GoalsPage from "./pages/Goals";
import HoldingsPage from "./pages/Holdings";
import PortfolioPage from "./pages/Portfolio";
import SettingsPage from "./pages/Settings";

function App() {
  return (
    <PortfolioProvider>
      <Routes>
        <Route element={<AppLayout />}>
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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </PortfolioProvider>
  );
}

export default App;
