import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import CreateGoalPage from "./pages/CreateGoal";
import DashboardPage from "./pages/Dashboard";
import GoalsPage from "./pages/Goals";
import HoldingsPage from "./pages/Holdings";
import SettingsPage from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/new" element={<CreateGoalPage />} />
        <Route path="/goals/:id/edit" element={<CreateGoalPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
