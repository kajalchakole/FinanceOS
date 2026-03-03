import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] transition-colors duration-300 ease-out dark:bg-[#0B0F14] dark:bg-[radial-gradient(circle_at_top,_#111827_0%,_#0B0F14_60%)]">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />

          <main className="app-fade-in min-w-0 flex-1 transition-colors duration-300 ease-in-out">
            <div className="mx-auto min-w-0 max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
