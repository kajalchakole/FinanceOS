import React from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] transition-colors duration-300 ease-out dark:bg-[#0B0F14] dark:bg-[radial-gradient(circle_at_top,_#111827_0%,_#0B0F14_60%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <TopHeader />

          <main className="app-fade-in flex-1 p-8 lg:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
