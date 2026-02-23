import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import GoalCard from "../components/GoalCard";
import api from "../services/api";

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await api.get("/goals");
        setGoals(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load goals");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoals();
  }, []);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-text">Goals</h2>
          <p className="mt-1 text-sm text-brand-muted">Manage your financial goals.</p>
        </div>

        <Link
          to="/goals/new"
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          New Goal
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-brand-muted">Loading goals...</p> : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {!isLoading && !error && goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-panel p-10 text-center text-sm text-brand-muted">
          No goals created yet
        </div>
      ) : null}

      {!isLoading && !error && goals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default GoalsPage;
