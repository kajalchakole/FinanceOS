import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../services/api";

function GoalDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [goalIntelligence, setGoalIntelligence] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [unlinkingHoldingId, setUnlinkingHoldingId] = useState("");
  const [unlinkingFDId, setUnlinkingFDId] = useState("");
  const [unlinkingCashId, setUnlinkingCashId] = useState("");

  const fetchDetail = useCallback(async () => {
    const [detailResponse, intelligenceResponse] = await Promise.all([
      api.get(`/goals/${id}/detail`),
      api.get("/goals/intelligence")
    ]);
    setDetail(detailResponse.data);
    const intelligenceRows = Array.isArray(intelligenceResponse.data) ? intelligenceResponse.data : [];
    const matchedGoal = intelligenceRows.find((goal) => String(goal.goalId) === String(id)) || null;
    setGoalIntelligence(matchedGoal);
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

  const handleExportXlsx = async () => {
    setError("");
    setIsExporting(true);

    try {
      const response = await api.get(`/goals/${id}/export`, { responseType: "blob" });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const contentDisposition = response.headers?.["content-disposition"] || "";
      const match = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName = match?.[1] || `goal_${id}_export.xlsx`;
      const fileUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to export goal XLSX");
    } finally {
      setIsExporting(false);
    }
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

  const handleUnlinkCashAccount = async (cashId) => {
    setError("");
    setUnlinkingCashId(cashId);

    try {
      await api.put(`/cash-accounts/${cashId}`, { goalId: null });
      await fetchDetail();
      refreshDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to unlink cash account");
    } finally {
      setUnlinkingCashId("");
    }
  };

  const formatCurrency = (value, fractionDigits = 2) => `\u20B9${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: fractionDigits
  })}`;

  const projection = detail?.projection || {};
  const linkedHoldings = detail?.linkedHoldings || [];
  const linkedFixedDeposits = detail?.linkedFixedDeposits || [];
  const linkedCashAccounts = detail?.linkedCashAccounts || [];
  const totalAllocated = Number(detail?.totalAllocated || 0);
  const allocationPercent = Number(detail?.allocationPercent || 0);
  const normalizedAllocationPercent = Number.isFinite(allocationPercent) ? allocationPercent : 0;
  const epfContribution = Number(detail?.epfContribution || 0);
  const npsContribution = Number(detail?.npsContribution || 0);
  const ppfContribution = Number(detail?.ppfContribution || 0);
  const commodityContribution = Number(detail?.commodityContribution || 0);
  const cashContribution = Number(detail?.cashContribution || 0);

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
          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={isExporting}
            className="rounded-xl border border-brand-line px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting..." : "Export XLSX"}
          </button>
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
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-muted">Linked Cash Accounts</p>
                <p className="mt-1 text-base font-semibold text-brand-text">{linkedCashAccounts.length}</p>
              </div>
              {commodityContribution > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Physical Commodity</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(commodityContribution)}</p>
                </div>
              ) : null}
              {cashContribution > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Cash Contribution</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(cashContribution)}</p>
                </div>
              ) : null}
              {detail?.goal?.useEpf ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">EPF Contribution</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(epfContribution)}</p>
                </div>
              ) : null}
              {detail?.goal?.useNps ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">NPS Contribution</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(npsContribution)}</p>
                </div>
              ) : null}
              {detail?.goal?.usePpf ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">PPF Contribution</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(ppfContribution)}</p>
                </div>
              ) : null}
            </div>
          </div>

          {goalIntelligence ? (
            <div className="rounded-2xl border border-brand-line bg-brand-panel p-5 shadow-soft">
              <h3 className="text-lg font-semibold tracking-tight text-brand-text">Goal Intelligence</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Future Required</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(goalIntelligence.futureRequired)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Projected Corpus</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{formatCurrency(goalIntelligence.projectedCorpus)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Gap</p>
                  <p className={`mt-1 text-base font-semibold ${Number(goalIntelligence.gap || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCurrency(goalIntelligence.gap)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Status</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">{goalIntelligence.status}</p>
                </div>
              </div>
              {Array.isArray(goalIntelligence.recoverySuggestions) && goalIntelligence.recoverySuggestions.length > 0 ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm font-semibold text-rose-700">Recovery Suggestions</p>
                  <div className="mt-2 space-y-1">
                    {goalIntelligence.recoverySuggestions.map((suggestion, index) => (
                      <p key={`${suggestion.type}-${index}`} className="text-xs text-rose-700">
                        {suggestion.type}
                        {suggestion.amount !== undefined ? `: ${formatCurrency(suggestion.amount)}` : ""}
                        {suggestion.years !== undefined ? `: ${suggestion.years} year(s)` : ""}
                        {suggestion.targetReturnRate !== undefined ? `: ${Number(suggestion.targetReturnRate).toFixed(2)}%` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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
                <table className="fo-table">
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
                  <tbody className="fo-table-body">
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
                <table className="fo-table">
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
                  <tbody className="fo-table-body">
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

          <div className="overflow-hidden rounded-2xl border border-brand-line bg-brand-panel shadow-soft">
            <div className="border-b border-brand-line px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight text-brand-text">Allocated Cash Accounts</h3>
            </div>

            {linkedCashAccounts.length === 0 ? (
              <div className="p-8 text-center text-sm text-brand-muted">
                No cash accounts are linked to this goal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="fo-table">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-brand-text">Account Name</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Bank</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Balance</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Interest Rate</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">% of Allocated</th>
                      <th className="px-5 py-3 font-semibold text-brand-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="fo-table-body">
                    {linkedCashAccounts.map((account) => {
                      const balance = Number(account.balance || 0);
                      const accountShare = totalAllocated > 0 ? (balance / totalAllocated) * 100 : 0;

                      return (
                        <tr key={account._id}>
                          <td className="px-5 py-3 text-brand-text">{account.name}</td>
                          <td className="px-5 py-3 text-brand-muted">{account.bank}</td>
                          <td className="px-5 py-3 font-semibold text-brand-text">{formatCurrency(balance)}</td>
                          <td className="px-5 py-3 text-brand-muted">{account.interestRate ? `${Number(account.interestRate).toFixed(2)}%` : "-"}</td>
                          <td className="px-5 py-3 text-brand-muted">{accountShare.toFixed(2)}%</td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => handleUnlinkCashAccount(account._id)}
                              disabled={unlinkingCashId === account._id}
                              className="rounded-lg border border-brand-line px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {unlinkingCashId === account._id ? "Unlinking..." : "Unlink"}
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
        </>
      ) : null}
    </section>
  );
}

export default GoalDetailPage;

