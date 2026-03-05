import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { label: "Dashboard", to: "/dashboard", icon: "bi-speedometer2" },
  { label: "Goals", to: "/goals", icon: "bi-bullseye" },
  { label: "Portfolio", to: "/portfolio", icon: "bi-pie-chart" },
  { label: "Holdings", to: "/holdings", icon: "bi-briefcase" },
  { label: "Fixed Deposits", to: "/fixed-deposits", icon: "bi-bank" },
  { label: "EPF", to: "/epf", icon: "bi-safe" },
  { label: "NPS", to: "/nps", icon: "bi-graph-up-arrow" },
  { label: "PPF", to: "/ppf", icon: "bi-piggy-bank" },
  { label: "Physical Commodity", to: "/physical-commodities", icon: "bi-gem" },
  { label: "Cash Accounts", to: "/cash-accounts", icon: "bi-wallet2" },
  { label: "Assets", to: "/assets", icon: "bi-building" },
  { label: "Liabilities", to: "/liabilities", icon: "bi-exclamation-triangle" },
  { label: "Security Logs", to: "/security", icon: "bi-shield-lock" },
  { label: "Settings", to: "/settings", icon: "bi-gear" }
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
            <span className="inline-flex items-center gap-2">
              <i className={`bi ${link.icon}`} aria-hidden="true" />
              <span>{link.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
