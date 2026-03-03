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
  { label: "Security", to: "/security" },
  { label: "Settings", to: "/settings" }
];

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 border-r border-gray-200 bg-white px-4 py-5 lg:block">
      <p className="mb-5 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">Workspace</p>

      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                "block rounded-md px-3 py-2.5 text-sm transition-all duration-200 ease-out",
                isActive
                  ? "border-l-4 border-indigo-600 bg-indigo-50 font-medium text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50"
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
