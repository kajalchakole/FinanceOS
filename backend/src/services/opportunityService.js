import opportunityStrategy from "../config/opportunityStrategy.js";

const toNumber = (value) => Number(value || 0);

const thresholdMatches = (marketDropPercent, threshold) => marketDropPercent >= toNumber(threshold.drop);

export const generateDeploymentPlan = (deployAmount) => {
  const safeDeployAmount = Math.max(0, toNumber(deployAmount));
  const allocationEntries = Object.entries(opportunityStrategy.allocationPlan || {});

  return {
    deployAmount: safeDeployAmount,
    allocation: allocationEntries.map(([instrument, weight]) => ({
      instrument: instrument.replaceAll("_", " "),
      amount: safeDeployAmount * toNumber(weight)
    }))
  };
};

export const evaluateMarketOpportunity = ({ marketDropPercent, opportunityFundValue }) => {
  const safeDrop = Math.max(0, toNumber(marketDropPercent));
  const safeOpportunityFundValue = Math.max(0, toNumber(opportunityFundValue));
  const thresholds = [...(opportunityStrategy.thresholds || [])]
    .sort((left, right) => toNumber(left.drop) - toNumber(right.drop));

  const applicableThresholds = thresholds.filter((threshold) => thresholdMatches(safeDrop, threshold));
  const selectedThreshold = applicableThresholds.length > 0
    ? applicableThresholds[applicableThresholds.length - 1]
    : null;
  const deployPercent = selectedThreshold ? toNumber(selectedThreshold.deploy) : 0;
  const deployAmount = safeOpportunityFundValue * deployPercent;
  const deploymentPlan = generateDeploymentPlan(deployAmount);

  return {
    marketDropPercent: safeDrop,
    opportunityFundValue: safeOpportunityFundValue,
    thresholdMatched: selectedThreshold ? toNumber(selectedThreshold.drop) : null,
    deployPercent,
    ...deploymentPlan
  };
};
