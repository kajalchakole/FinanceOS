import Holding from "../modules/holdings/holding.model.js";
import Asset from "../models/Asset.js";
import { getNetWorthSnapshot } from "./netWorthSnapshotService.js";

const distributionCategories = [
  "Equity",
  "Mutual Fund",
  "ETF",
  "Real Estate",
  "Vehicle",
  "Gold",
  "Cash",
  "Business",
  "Other"
];

const getHoldingValue = (holding) => Number(holding.quantity || 0) * Number(holding.currentPrice || 0);

const normalizeHoldingCategory = (instrumentType) => {
  const normalized = String(instrumentType || "").trim().toLowerCase();

  if (normalized === "equity") {
    return "Equity";
  }

  if (normalized === "mutual fund" || normalized === "mf") {
    return "Mutual Fund";
  }

  if (normalized === "etf") {
    return "ETF";
  }

  if (normalized === "cash") {
    return "Cash";
  }

  return null;
};

const buildBaseDistributionMap = () => {
  return distributionCategories.reduce((accumulator, category) => {
    accumulator.set(category, 0);
    return accumulator;
  }, new Map());
};

export const calculateNetWorth = async () => {
  const snapshot = await getNetWorthSnapshot();
  const financialAssetsValue = Number(snapshot.totalAssets || 0) - Number(snapshot.assetValue || 0);
  const assetValue = Number(snapshot.assetValue || 0);
  const totalNetWorth = Number(snapshot.netWorth || 0);

  return {
    financialAssetsValue,
    assetValue,
    totalNetWorth,
    grossNetWorth: Number(snapshot.grossNetWorth || 0),
    totalAssets: Number(snapshot.totalAssets || 0),
    totalLiabilities: Number(snapshot.totalLiabilities || 0)
  };
};

export const calculateLiquidity = async () => {
  const [holdings, assets] = await Promise.all([
    Holding.find().lean(),
    Asset.find().lean()
  ]);

  const netWorth = holdings.reduce((sum, holding) => sum + getHoldingValue(holding), 0)
    + assets.reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);

  let liquidValue = 0;
  let semiLiquidValue = 0;
  let illiquidValue = 0;

  holdings.forEach((holding) => {
    const category = normalizeHoldingCategory(holding.instrumentType);
    const value = getHoldingValue(holding);

    if (["Equity", "Mutual Fund", "ETF", "Cash"].includes(category)) {
      liquidValue += value;
    } else {
      illiquidValue += value;
    }
  });

  assets.forEach((asset) => {
    const value = Number(asset.currentValue || 0);

    if (asset.category === "Cash") {
      liquidValue += value;
      return;
    }

    if (asset.category === "Gold") {
      semiLiquidValue += value;
      return;
    }

    illiquidValue += value;
  });

  const liquidityRatio = netWorth > 0 ? liquidValue / netWorth : 0;

  return {
    liquidValue,
    semiLiquidValue,
    illiquidValue,
    liquidityRatio
  };
};

export const calculateWealthDistribution = async () => {
  const [holdings, assets] = await Promise.all([
    Holding.find().lean(),
    Asset.find().lean()
  ]);

  const distributionMap = buildBaseDistributionMap();

  holdings.forEach((holding) => {
    const category = normalizeHoldingCategory(holding.instrumentType);

    if (!category) {
      return;
    }

    const current = Number(distributionMap.get(category) || 0);
    distributionMap.set(category, current + getHoldingValue(holding));
  });

  assets.forEach((asset) => {
    const category = distributionMap.has(asset.category) ? asset.category : "Other";
    const current = Number(distributionMap.get(category) || 0);
    distributionMap.set(category, current + Number(asset.currentValue || 0));
  });

  return [...distributionMap.entries()]
    .map(([category, value]) => ({
      category,
      value
    }))
    .filter((row) => Number(row.value || 0) > 0);
};

export const getNetWorthSummary = async () => {
  const [netWorth, liquidity, distribution] = await Promise.all([
    calculateNetWorth(),
    calculateLiquidity(),
    calculateWealthDistribution()
  ]);

  return {
    totalNetWorth: netWorth.totalNetWorth,
    financialAssetsValue: netWorth.financialAssetsValue,
    assetValue: netWorth.assetValue,
    grossNetWorth: netWorth.grossNetWorth,
    totalAssets: netWorth.totalAssets,
    totalLiabilities: netWorth.totalLiabilities,
    liquidValue: liquidity.liquidValue,
    semiLiquidValue: liquidity.semiLiquidValue,
    illiquidValue: liquidity.illiquidValue,
    liquidityRatio: liquidity.liquidityRatio,
    distribution
  };
};
