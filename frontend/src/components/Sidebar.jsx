import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Goals", to: "/goals" },
  { label: "Holdings", to: "/holdings" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Fixed Deposits", to: "/fixed-deposits" },
  { label: "EPF", to: "/epf" },
  { label: "NPS", to: "/nps" },
  { label: "PPF", to: "/ppf" },
  { label: "Physical Commodity", to: "/physical-commodities" },
  { label: "Cash Accounts", to: "/cash-accounts" },
  { label: "Security", to: "/security" },
  { label: "Settings", to: "/settings" }
];

function Sidebar({ sidebarOpen = false, onClose = () => {} }) {
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-50 h-screen w-64 flex-shrink-0 border-r border-gray-200 bg-white px-4 py-5 transition-transform duration-300 ease-in-out dark:border-[#1F2937] dark:bg-[#0F141A] lg:relative lg:z-auto lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      ].join(" ")}
    >
      <p className="mb-5 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-[#6B7280]">Workspace</p>

      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              [
                "block rounded-md px-3 py-2.5 text-sm transition-all duration-200 ease-out",
                isActive
                  ? "border-l-4 border-indigo-600 bg-indigo-50 font-medium text-indigo-700 dark:bg-[#1C2430] dark:text-indigo-300"
                  : "text-gray-600 hover:bg-gray-50 dark:text-[#9CA3AF] dark:hover:bg-[#161D26]"
              ].join(" ")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
