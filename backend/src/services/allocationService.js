import allocationTargets from "../config/allocationTargets.js";
import Asset from "../models/Asset.js";
import CashAccount from "../models/CashAccount.js";
import PhysicalCommodity from "../modules/physicalCommodities/physicalCommodity.model.js";
import Holding from "../modules/holdings/holding.model.js";

const getHoldingValue = (holding) => Number(holding.quantity || 0) * Number(holding.currentPrice || 0);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const debtKeywords = [
  "debt",
  "bond",
  "gilt",
  "liquid",
  "money market",
  "corporate bond",
  "short duration",
  "ultra short",
  "income fund",
  "treasury"
];

const isDebtMutualFund = (holding) => {
  const type = normalizeText(holding.instrumentType);
  if (type !== "mutual fund" && type !== "mf") {
    return false;
  }

  const name = normalizeText(holding.instrumentName);
  return debtKeywords.some((keyword) => name.includes(keyword));
};

const isGoldHolding = (holding) => {
  const type = normalizeText(holding.instrumentType);
  const name = normalizeText(holding.instrumentName);

  if (type.includes("gold")) {
    return true;
  }

  return name.includes("gold") || name.includes("sovereign gold") || name.includes("sgb");
};

const classifyHolding = (holding) => {
  const taggedCategory = String(holding.allocationCategory || "").trim();
  if (taggedCategory && allocationTargets[taggedCategory] !== undefined) {
    return taggedCategory;
  }

  const type = normalizeText(holding.instrumentType);
  const name = normalizeText(holding.instrumentName);

  if (isGoldHolding(holding)) {
    return "Gold";
  }

  if (type === "equity") {
    return "Equity";
  }

  if (type === "bond" || type.includes("bond")) {
    return "Debt";
  }

  if (type === "mutual fund" || type === "mf") {
    return isDebtMutualFund(holding) ? "Debt" : "Equity";
  }

  if (type === "etf") {
    return "Equity";
  }

  if (type === "cash") {
    return "Cash";
  }

  if (type === "opportunity" || name.includes("opportunity")) {
    return "Opportunity";
  }

  return null;
};

const classifyAsset = (asset) => {
  const taggedCategory = String(asset.allocationCategory || "").trim();
  if (taggedCategory && allocationTargets[taggedCategory] !== undefined) {
    return taggedCategory;
  }

  const category = normalizeText(asset.category);
  const name = normalizeText(asset.name);

  if (category === "real estate" || category === "vehicle") {
    return null;
  }

  if (category === "gold") {
    return "Gold";
  }

  if (category === "cash") {
    return "Cash";
  }

  if (category === "other" && name.includes("opportunity")) {
    return "Opportunity";
  }

  return null;
};

const buildAllocationMap = () => {
  return Object.keys(allocationTargets).reduce((accumulator, category) => {
    accumulator.set(category, 0);
    return accumulator;
  }, new Map());
};

export const calculateActualAllocation = async () => {
  const [holdings, assets, cashAccounts, physicalCommodities] = await Promise.all([
    Holding.find().lean(),
    Asset.find().lean(),
    CashAccount.find().lean(),
    PhysicalCommodity.find({ isActive: true }).lean()
  ]);

  const allocationMap = buildAllocationMap();

  holdings.forEach((holding) => {
    const category = classifyHolding(holding);
    if (!category || !allocationMap.has(category)) {
      return;
    }

    const value = getHoldingValue(holding);
    allocationMap.set(category, Number(allocationMap.get(category) || 0) + value);
  });

  assets.forEach((asset) => {
    const category = classifyAsset(asset);
    if (!category || !allocationMap.has(category)) {
      return;
    }

    const value = Number(asset.currentValue || 0);
    allocationMap.set(category, Number(allocationMap.get(category) || 0) + value);
  });

  cashAccounts.forEach((account) => {
    const balance = Number(account.balance || 0);
    allocationMap.set("Cash", Number(allocationMap.get("Cash") || 0) + balance);
  });

  physicalCommodities.forEach((commodity) => {
    if (normalizeText(commodity.commodityType) !== "gold") {
      return;
    }

    const value = Number(commodity.quantity || 0) * Number(commodity.currentPricePerUnit || 0);
    allocationMap.set("Gold", Number(allocationMap.get("Gold") || 0) + value);
  });

  const totalFinancialValue = [...allocationMap.values()].reduce((sum, value) => sum + Number(value || 0), 0);

  const rows = [...allocationMap.entries()].map(([category, value]) => ({
    category,
    value,
    percent: totalFinancialValue > 0 ? value / totalFinancialValue : 0
  }));

  return {
    totalFinancialValue,
    allocation: rows
  };
};

const buildDriftAnalysis = (allocation) => {
  const totalFinancialValue = allocation.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return allocation.map((row) => {
    const target = Number(allocationTargets[row.category] || 0);
    const actual = Number(row.percent || 0) * 100;
    const drift = actual - target;
    const targetAmount = totalFinancialValue * (target / 100);
    const actualAmount = Number(row.value || 0);
    const driftAmount = actualAmount - targetAmount;

    return {
      category: row.category,
      target,
      actual,
      drift,
      targetAmount,
      actualAmount,
      driftAmount
    };
  });
};

export const detectAllocationDrift = async () => {
  const { allocation } = await calculateActualAllocation();
  return buildDriftAnalysis(allocation);
};

const buildRebalanceSuggestions = ({ totalFinancialValue, driftAnalysis }) => {
  return driftAnalysis
    .filter((item) => Math.abs(Number(item.drift || 0)) > 0.01)
    .map((item) => ({
      category: item.category,
      action: item.drift > 0 ? "Reduce" : "Increase",
      amount: totalFinancialValue * (Math.abs(item.drift) / 100)
    }))
    .filter((item) => Number(item.amount || 0) > 0);
};

export const generateRebalanceSuggestions = async () => {
  const { totalFinancialValue, allocation } = await calculateActualAllocation();
  const driftAnalysis = buildDriftAnalysis(allocation);
  return buildRebalanceSuggestions({ totalFinancialValue, driftAnalysis });
};

export const getAllocationSummary = async () => {
  const { totalFinancialValue, allocation } = await calculateActualAllocation();
  const driftAnalysis = buildDriftAnalysis(allocation);
  const rebalanceSuggestions = buildRebalanceSuggestions({
    totalFinancialValue,
    driftAnalysis
  });

  return {
    totalFinancialValue,
    actualAllocation: allocation,
    driftAnalysis,
    rebalanceSuggestions
  };
};
