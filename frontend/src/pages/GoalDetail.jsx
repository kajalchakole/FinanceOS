import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../services/api";

function GoalDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [unlinkingHoldingId, setUnlinkingHoldingId] = useState("");
  const [unlinkingFDId, setUnlinkingFDId] = useState("");

  const fetchDetail = useCallback(async () => {
    const response = await api.get(`/goals/${id}/detail`);
    setDetail(response.data);
  }, [id]);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setError("");
        await fetchDetail();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load goal detail");
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [fetchDetail]);

  const refreshDashboard = () => {
    window.dispatchEvent(new CustomEvent("dashboard:refresh"));
  };

  const handleUnlinkHolding = async (holdingId) => {
    setError("");
    setUnlinkingHoldingId(holdingId);

    try {
      await api.patch(`/holdings/${holdingId}`, { goalId: null });
      await fetchDetail();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to unlink holding");
    } finally {
      setUnlinkingHoldingId("");
    }
  };

  const handleUnlinkFixedDeposit = async (fdId) => {
    setError("");
    setUnlinkingFDId(fdId);

    try {
      await api.patch(`/fixed-deposits/${fdId}`, { goalId: null });
      await fetchDetail();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to unlink fixed deposit");
    } finally {
      setUnlinkingFDId("");
    }
  };

  const formatCurrency = (value, fractionDigits = 2) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: fractionDigits
  })}`;

  const projection = detail?.projection || {};
  const linkedHoldings = detail?.linkedHoldings || [];
  const linkedFixedDeposits = detail?.linkedFixedDeposits || [];
  const totalAllocated = Number(detail?.totalAllocated || 0);
  const allocationPercent = Number(detail?.allocationPercent || 0);
  const normalizedAllocationPercent = Number.isFinite(allocationPercent) ? allocationPercent : 0;

  const summaryItems = useMemo(() => ([
    {
      label: "Future Required",
      value: formatCurrency(projection.futureRequired, 0)
    },
    {
      label: "Projected Corpus",
      value: formatCurrency(projection.projectedCorpus, 0)
    },
    {
      label: "Gap",
      value: formatCurrency(projection.gap, 0),
      valueClassName: Number(projection.gap || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
    },
    {
      label: "Status",
      value: projection.status || "At Risk"
    }
  ]), [projection.futureRequired, projection.gap, projection.projectedCorpus, projection.status]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">Goal Detail</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-brand-text">{detail?.goal?.name || "Goal"}</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Detailed allocation view and linked holdings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/goals"
            className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-muted transition hover:bg-slate-50"
          >
            Back to Goals
          </Link>
          <Link
            to={`/goals/${id}/edit`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit Goal
          </Link>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading goal detail...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      {!isLoading && !error && detail ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
              <article key={item.label} className="rounded-2xl border border-brand-line bg-brand-panel p-5 shadow-soft">
                <p className="text-xs uppercase tracking-wide text-brand-muted">{item.label}</p>
                <p className={`mt-2 text-lg font-semibold tracking-tight text-brand-text ${item.valueClassName || ""}`}>
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-brand-line bg-brand-panel p-5 shadow-soft">
            <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocation Summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Total Allocated</p>
                <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(totalAllocated)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Allocation Percent</p>
                <p className="mt-1 text-base font-semibold text-brand-text">{normalizedAllocationPercent.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Linked Holdings</p>
                <p className="mt-1 text-base font-semibold text-brand-text">{linkedHoldings.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Linked FDs</p>
                <p className="mt-1 text-base font-semibold text-brand-text">{linkedFixedDeposits.length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
            <div className="border-b border-brand-line px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocated Holdings</h3>
            </div>

            {linkedHoldings.length === 0 ? (
              <div className="p-8 text-center text-sm text-brand-muted">
                No holdings are linked to this goal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-line text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-brand-text">Instrument</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Broker</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Quantity</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Current Price</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Current Value</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">% of Allocated</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line">
                    {linkedHoldings.map((holding) => {
                      const currentValue = Number(holding.quantity || 0) * Number(holding.currentPrice || 0);
                      const holdingShare = totalAllocated > 0 ? (currentValue / totalAllocated) * 100 : 0;

                      return (
                        <tr key={holding._id}>
                          <td className="px-5 py-3 text-brand-text">{holding.instrumentName}</td>
                          <td className="px-5 py-3 text-brand-muted">{holding.brokerDisplayName || holding.broker}</td>
                          <td className="px-5 py-3 text-brand-muted">{holding.quantity}</td>
                          <td className="px-5 py-3 text-brand-muted">{formatCurrency(holding.currentPrice)}</td>
                          <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(currentValue)}</td>
                          <td className="px-5 py-3 text-brand-muted">{holdingShare.toFixed(2)}%</td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => handleUnlinkHolding(holding._id)}
                              disabled={unlinkingHoldingId === holding._id}
                              className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {unlinkingHoldingId === holding._id ? "Unlinking..." : "Unlink"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
            <div className="border-b border-brand-line px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocated Fixed Deposits</h3>
            </div>

            {linkedFixedDeposits.length === 0 ? (
              <div className="p-8 text-center text-sm text-brand-muted">
                No fixed deposits are linked to this goal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-line text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-brand-text">Bank</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">FD Name</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Principal</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Current Value</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Maturity Date</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Status</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-line">
                    {linkedFixedDeposits.map((fd) => (
                      <tr key={fd._id}>
                        <td className="px-5 py-3 text-brand-text">{fd.bank}</td>
                        <td className="px-5 py-3 text-brand-muted">{fd.fdName}</td>
                        <td className="px-5 py-3 text-brand-muted">{formatCurrency(fd.principal)}</td>
                        <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(fd.cachedValue)}</td>
                        <td className="px-5 py-3 text-brand-muted">{fd.maturityDate?.slice(0, 10)}</td>
                        <td className="px-5 py-3 text-brand-muted capitalize">{fd.status}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => handleUnlinkFixedDeposit(fd._id)}
                            disabled={unlinkingFDId === fd._id}
                            className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {unlinkingFDId === fd._id ? "Unlinking..." : "Unlink"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default GoalDetailPage;
