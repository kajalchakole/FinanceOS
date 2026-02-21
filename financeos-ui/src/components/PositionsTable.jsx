import { useMemo, useState } from "react";

const CURRENCY_CODE = import.meta.env.VITE_CURRENCY || "INR";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: CURRENCY_CODE,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 4,
});

const columns = [
  { key: "instrumentName", label: "Instrument Name", sortable: true, align: "left" },
  { key: "type", label: "Type", sortable: true, align: "left" },
  { key: "quantity", label: "Quantity", sortable: true, align: "right" },
  { key: "avgPrice", label: "Avg Price", sortable: true, align: "right" },
  { key: "currentPrice", label: "Current Price", sortable: true, align: "right" },
  { key: "marketValue", label: "Market Value", sortable: true, align: "right" },
  { key: "gainLoss", label: "Gain/Loss", sortable: true, align: "right" },
];

const PositionsTable = ({ positions = [], loading = false }) => {
  const [sortKey, setSortKey] = useState("marketValue");
  const [sortDirection, setSortDirection] = useState("desc");
  const skeletonRows = Array.from({ length: 6 });

  const sortedPositions = useMemo(() => {
    const data = [...positions];
    data.sort((a, b) => {
      const aValue = a?.[sortKey];
      const bValue = b?.[sortKey];

      if (typeof aValue === "string" || typeof bValue === "string") {
        const aText = String(aValue || "");
        const bText = String(bValue || "");
        const comparison = aText.localeCompare(bText, "en-IN", { sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      }

      const aNumber = Number(aValue || 0);
      const bNumber = Number(bValue || 0);
      return sortDirection === "asc" ? aNumber - bNumber : bNumber - aNumber;
    });

    return data;
  }, [positions, sortDirection, sortKey]);

  const onSort = (nextKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const renderSortIndicator = (key) => {
    if (key !== sortKey) {
      return " -";
    }
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const formatCell = (key, value) => {
    if (key === "quantity") {
      return quantityFormatter.format(Number(value || 0));
    }

    if (key === "avgPrice" || key === "currentPrice" || key === "marketValue" || key === "gainLoss") {
      return priceFormatter.format(Number(value || 0));
    }

    return value || "-";
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Positions</h2>
      <div className="mt-4 max-h-[26rem] overflow-auto rounded-lg border border-slate-800/70">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400">
            <tr className="border-b border-slate-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-medium ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  <button
                    className="select-none text-inherit hover:text-slate-200"
                    onClick={() => onSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {renderSortIndicator(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((_, index) => (
                  <tr key={`positions-skeleton-${index}`} className="border-b border-slate-800/70">
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                  </tr>
                ))
              : sortedPositions.map((position) => (
                  <tr key={position.id || position.instrumentName} className="border-b border-slate-800/70 text-slate-200">
                    {columns.map((column) => {
                      const value = position[column.key];
                      const isNegative = Number(value) < 0;

                      return (
                        <td
                          key={`${position.id || position.instrumentName}-${column.key}`}
                          className={`px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"} ${
                            column.key === "gainLoss" ? (isNegative ? "text-rose-400" : "text-emerald-400") : ""
                          } ${isNegative && column.key !== "gainLoss" ? "text-rose-400" : ""}`}
                        >
                          {formatCell(column.key, value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && positions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No positions found.</p>
      ) : null}
    </section>
  );
};

export default PositionsTable;
