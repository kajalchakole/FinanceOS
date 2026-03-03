import React, { useEffect, useState } from "react";

import { auditLogApi } from "../services/api";

function SecurityPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await auditLogApi.list(100);
        if (!active) {
          return;
        }
        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError.response?.data?.message || "Unable to load audit logs");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-panel p-8 shadow-soft">
      <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Security Logs</h2>
      <p className="mt-1 text-sm text-brand-muted">Recent authentication, recovery, and backup audit events.</p>

      {isLoading ? <p className="mt-4 text-sm text-brand-muted">Loading logs...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-line text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-brand-text">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-brand-text">Event</th>
                <th className="px-4 py-3 font-semibold text-brand-text">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 text-brand-muted">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-brand-text">{log.eventType}</td>
                  <td className="px-4 py-3 text-brand-muted">{JSON.stringify(log.metadata || {})}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-brand-muted" colSpan={3}>No audit logs found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default SecurityPage;
