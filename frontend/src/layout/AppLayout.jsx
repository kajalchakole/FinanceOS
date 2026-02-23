import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import TopHeader from "../components/TopHeader";

function AppLayout() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <Sidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <TopHeader />

          <main className="flex-1 p-8 lg:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
