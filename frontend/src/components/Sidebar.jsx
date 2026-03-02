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
  { label: "Settings", to: "/settings" }
];

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 border-r border-brand-line bg-brand-panel p-8 shadow-soft lg:block">
      <p className="mb-10 text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">Workspace</p>

      <nav className="space-y-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              [
                "block rounded-xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white shadow-soft"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
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
