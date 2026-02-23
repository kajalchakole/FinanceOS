export const calculateProjection = (goal) => {
  const currentYear = new Date().getFullYear();
  const years = goal.targetYear - currentYear;

  if (years <= 0) {
    const projectedCorpus = goal.initialInvestment;

    return {
      futureRequired: 0,
      projectedCorpus,
      gap: projectedCorpus,
      status: "Expired",
      yearsRemaining: years
    };
  }

  const futureRequired =
    goal.presentValue * Math.pow(1 + goal.inflationRate / 100, years);

  let corpus = goal.initialInvestment;
  let annualSIP = goal.monthlySIP * 12;

  for (let i = 0; i < years; i += 1) {
    corpus = corpus * (1 + goal.expectedReturnRate / 100);
    corpus += annualSIP;
    annualSIP = annualSIP * (1 + goal.stepUpRate / 100);
  }

  const projectedCorpus = corpus;
  const gap = projectedCorpus - futureRequired;
  const status = gap >= 0 ? "On Track" : "At Risk";

  return {
    futureRequired,
    projectedCorpus,
    gap,
    status,
    yearsRemaining: years
  };
};

