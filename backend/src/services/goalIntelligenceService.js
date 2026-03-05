import Goal from "../modules/goals/goal.model.js";
import { getCorpusByGoalIds } from "../modules/projection/projection.service.js";

const CURRENT_YEAR = new Date().getFullYear();
const MAX_DELAY_YEARS = 30;

const toNumber = (value) => Number(value || 0);

const yearsToGoal = (targetYear) => {
  const years = Math.floor(toNumber(targetYear) - CURRENT_YEAR + 1);
  return years > 0 ? years : 0;
};

const projectCorpus = ({ existingCorpus, monthlySIP, expectedReturnRate, stepUpRate, years }) => {
  const annualReturn = toNumber(expectedReturnRate) / 100;
  let annualSIP = toNumber(monthlySIP) * 12;
  let corpus = toNumber(existingCorpus);

  for (let index = 0; index < years; index += 1) {
    corpus = corpus * (1 + annualReturn);
    corpus += annualSIP;
    annualSIP = annualSIP * (1 + (toNumber(stepUpRate) / 100));
  }

  return corpus;
};

const calculateFutureRequired = ({ presentValue, inflationRate, years }) => {
  return toNumber(presentValue) * Math.pow(1 + (toNumber(inflationRate) / 100), years);
};

const resolveGoalStatus = ({ gap, futureRequired }) => {
  if (gap >= 0) {
    return "Goal Met";
  }

  if (futureRequired <= 0) {
    return "On Track";
  }

  const gapRatio = gap / futureRequired;
  return gapRatio >= -0.1 ? "On Track" : "At Risk";
};

const calculateAdditionalSipRequired = ({
  futureRequired,
  existingCorpus,
  monthlySIP,
  expectedReturnRate,
  stepUpRate,
  years
}) => {
  if (years <= 0) {
    return 0;
  }

  const required = toNumber(futureRequired);
  const baseSip = toNumber(monthlySIP);

  const projectWithSip = (sipAmount) => projectCorpus({
    existingCorpus,
    monthlySIP: sipAmount,
    expectedReturnRate,
    stepUpRate,
    years
  });

  let low = 0;
  let high = Math.max(1000, baseSip * 10, required / Math.max(1, years * 12));

  while (projectWithSip(high) < required && high < 1e8) {
    high *= 2;
  }

  for (let index = 0; index < 40; index += 1) {
    const mid = (low + high) / 2;

    if (projectWithSip(mid) >= required) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.max(0, high - baseSip);
};

const calculateDelayYearsRequired = ({
  presentValue,
  inflationRate,
  existingCorpus,
  monthlySIP,
  expectedReturnRate,
  stepUpRate,
  baseYears
}) => {
  for (let delayYears = 1; delayYears <= MAX_DELAY_YEARS; delayYears += 1) {
    const totalYears = baseYears + delayYears;
    const futureRequired = calculateFutureRequired({
      presentValue,
      inflationRate,
      years: totalYears
    });
    const projectedCorpus = projectCorpus({
      existingCorpus,
      monthlySIP,
      expectedReturnRate,
      stepUpRate,
      years: totalYears
    });

    if (projectedCorpus >= futureRequired) {
      return delayYears;
    }
  }

  return null;
};

const calculateTargetReturnRate = ({
  futureRequired,
  existingCorpus,
  monthlySIP,
  stepUpRate,
  years
}) => {
  if (years <= 0) {
    return null;
  }

  const canMeetAtHighRate = projectCorpus({
    existingCorpus,
    monthlySIP,
    expectedReturnRate: 30,
    stepUpRate,
    years
  }) >= futureRequired;

  if (!canMeetAtHighRate) {
    return null;
  }

  let low = 0;
  let high = 30;

  for (let index = 0; index < 35; index += 1) {
    const mid = (low + high) / 2;
    const corpus = projectCorpus({
      existingCorpus,
      monthlySIP,
      expectedReturnRate: mid,
      stepUpRate,
      years
    });

    if (corpus >= futureRequired) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
};

export const generateGoalRecoveryOptions = (goalAnalysis) => {
  if (goalAnalysis.status !== "At Risk") {
    return [];
  }

  const suggestions = [];

  if (goalAnalysis.yearsRemaining <= 0) {
    suggestions.push({
      type: "Goal Year Reached",
      message: "SIP increase is not applicable because target year is current or past"
    });
    return suggestions;
  }

  const additionalSip = calculateAdditionalSipRequired({
    futureRequired: goalAnalysis.futureRequired,
    existingCorpus: goalAnalysis.existingCorpus,
    monthlySIP: goalAnalysis.monthlySIP,
    expectedReturnRate: goalAnalysis.expectedReturnRate,
    stepUpRate: goalAnalysis.stepUpRate,
    years: goalAnalysis.yearsRemaining
  });

  if (additionalSip > 0) {
    suggestions.push({
      type: "Increase SIP",
      amount: additionalSip
    });
  }

  const delayYears = calculateDelayYearsRequired({
    presentValue: goalAnalysis.presentValue,
    inflationRate: goalAnalysis.inflationRate,
    existingCorpus: goalAnalysis.existingCorpus,
    monthlySIP: goalAnalysis.monthlySIP,
    expectedReturnRate: goalAnalysis.expectedReturnRate,
    stepUpRate: goalAnalysis.stepUpRate,
    baseYears: goalAnalysis.yearsRemaining
  });

  if (delayYears !== null) {
    suggestions.push({
      type: "Delay Goal",
      years: delayYears
    });
  }

  const targetReturnRate = calculateTargetReturnRate({
    futureRequired: goalAnalysis.futureRequired,
    existingCorpus: goalAnalysis.existingCorpus,
    monthlySIP: goalAnalysis.monthlySIP,
    stepUpRate: goalAnalysis.stepUpRate,
    years: goalAnalysis.yearsRemaining
  });

  if (targetReturnRate !== null && targetReturnRate > goalAnalysis.expectedReturnRate) {
    suggestions.push({
      type: "Increase Expected Return",
      targetReturnRate
    });
  }

  return suggestions;
};

export const analyzeGoals = async () => {
  const goals = await Goal.find().lean();
  const linkedCorpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

  return goals.map((goal) => {
    const yearsRemaining = yearsToGoal(goal.targetYear);
    const linkedCorpus = toNumber(linkedCorpusByGoalId[goal._id.toString()]);
    const existingCorpus = linkedCorpus + toNumber(goal.initialInvestment);
    const futureRequired = calculateFutureRequired({
      presentValue: goal.presentValue,
      inflationRate: goal.inflationRate,
      years: yearsRemaining
    });
    const projectedCorpus = projectCorpus({
      existingCorpus,
      monthlySIP: goal.monthlySIP,
      expectedReturnRate: goal.expectedReturnRate,
      stepUpRate: goal.stepUpRate,
      years: yearsRemaining
    });
    const gap = projectedCorpus - futureRequired;
    const status = resolveGoalStatus({
      gap,
      futureRequired
    });

    const analysis = {
      goalId: goal._id,
      goalName: goal.name,
      presentValue: toNumber(goal.presentValue),
      inflationRate: toNumber(goal.inflationRate),
      expectedReturnRate: toNumber(goal.expectedReturnRate),
      stepUpRate: toNumber(goal.stepUpRate),
      monthlySIP: toNumber(goal.monthlySIP),
      yearsRemaining,
      existingCorpus,
      futureRequired,
      projectedCorpus,
      gap,
      status
    };

    return {
      ...analysis,
      recoverySuggestions: generateGoalRecoveryOptions(analysis)
    };
  });
};
