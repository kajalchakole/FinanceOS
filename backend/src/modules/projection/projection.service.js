export const calculateProjection = (goal) => {
  const currentYear = new Date().getFullYear();
  const years = goal.targetYear - currentYear;

  if (years <= 0) {
    return {
      futureRequired: 0,
      projectedCorpus: goal.initialInvestment,
      gap: goal.initialInvestment,
      status: "Expired",
      yearsRemaining: 0
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
  let status;

  if (projectedCorpus >= futureRequired) {
    status = "Goal Met";
  } else if (gap >= 0) {
    status = "On Track";
  } else {
    status = "At Risk";
  }

  return {
    futureRequired,
    projectedCorpus,
    gap,
    status,
    yearsRemaining: years
  };
};
