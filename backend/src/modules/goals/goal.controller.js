import Goal from "./goal.model.js";
import Holding from "../holdings/holding.model.js";
import FixedDeposit from "../fixedDeposits/fixedDeposit.model.js";
import EpfAccount from "../epf/epf.model.js";
import NpsAccount from "../nps/nps.model.js";
import PpfAccount from "../ppf/ppf.model.js";
import PhysicalCommodity from "../physicalCommodities/physicalCommodity.model.js";
import CashAccount from "../../models/CashAccount.js";
import XLSX from "xlsx";
import { calculateProjection, getCorpusByGoalIds } from "../projection/projection.service.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const conflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isTruthyFlag = (value) => value === true || value === "true" || value === 1 || value === "1";
const activeEpfAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};
const activeNpsAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};
const activePpfAccountFilter = {
  $or: [{ isActive: true }, { isActive: { $exists: false } }]
};

const findGoalByName = async (name, excludedGoalId) => {
  const query = {
    name: new RegExp(`^${escapeRegExp(name)}$`, "i")
  };

  if (excludedGoalId) {
    query._id = { $ne: excludedGoalId };
  }

  return Goal.findOne(query);
};

const buildGoalDetailPayload = async (goalId) => {
  const goal = await Goal.findById(goalId);

  if (!goal) {
    throw notFoundError("Goal not found");
  }

  const goalData = goal.toObject();
  const [linkedHoldings, linkedFixedDeposits, linkedPhysicalCommodities, linkedCashAccounts, epfAccounts, npsAccounts, ppfAccounts] = await Promise.all([
    Holding.find({ goalId: goal._id }).sort({ createdAt: -1 }),
    FixedDeposit.find({
      goalId: goal._id,
      status: { $in: ["active", "matured"] }
    }).sort({ maturityDate: 1 }),
    PhysicalCommodity.find({
      goalId: goal._id,
      isActive: true
    }).sort({ createdAt: -1 }),
    CashAccount.find({
      goalId: goal._id
    }).sort({ createdAt: -1 }),
    goal.useEpf ? EpfAccount.find(activeEpfAccountFilter) : Promise.resolve([]),
    goal.useNps ? NpsAccount.find(activeNpsAccountFilter) : Promise.resolve([]),
    goal.usePpf ? PpfAccount.find(activePpfAccountFilter) : Promise.resolve([])
  ]);

  const holdingsAllocated = linkedHoldings.reduce(
    (sum, holding) => sum + (Number(holding.quantity || 0) * Number(holding.currentPrice || 0)),
    0
  );
  const fixedDepositsAllocated = linkedFixedDeposits.reduce(
    (sum, fd) => sum + Number(fd.cachedValue || 0),
    0
  );
  const commodityContribution = linkedPhysicalCommodities.reduce(
    (sum, commodity) => sum + (Number(commodity.quantity || 0) * Number(commodity.currentPricePerUnit || 0)),
    0
  );
  const cashContribution = linkedCashAccounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );
  const epfContribution = goal.useEpf
    ? epfAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0)
    : 0;
  const npsContribution = goal.useNps
    ? npsAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0)
    : 0;
  const ppfContribution = goal.usePpf
    ? ppfAccounts.reduce((sum, account) => sum + Number(account.cachedValue || 0), 0)
    : 0;
  const totalAllocated = holdingsAllocated + fixedDepositsAllocated + commodityContribution + cashContribution;
  const projection = calculateProjection(goalData, totalAllocated + epfContribution + npsContribution + ppfContribution);

  const futureRequired = Number(projection.futureRequired || 0);
  const allocationPercent = futureRequired > 0
    ? (totalAllocated / futureRequired) * 100
    : 0;

  return {
    goal: goalData,
    projection,
    linkedHoldings,
    linkedFixedDeposits,
    linkedPhysicalCommodities,
    linkedCashAccounts,
    totalAllocated,
    allocationPercent,
    commodityContribution,
    cashContribution,
    epfContribution,
    npsContribution,
    ppfContribution
  };
};

export const createGoal = async (req, res, next) => {
  try {
    const normalizedName = req.body?.name?.trim();

    if (normalizedName) {
      const existingGoal = await findGoalByName(normalizedName);

      if (existingGoal) {
        throw conflictError("Goal name already exists");
      }
    }

    const goal = await Goal.create(req.body);

    if (isTruthyFlag(req.body?.useEpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useEpf: false } }
      );
    }

    if (isTruthyFlag(req.body?.useNps)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useNps: false } }
      );
    }

    if (isTruthyFlag(req.body?.usePpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { usePpf: false } }
      );
    }

    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find().sort({ createdAt: -1 });
    const corpusByGoalId = await getCorpusByGoalIds(goals.map((goal) => goal._id));

    const goalsWithProjection = goals.map((goal) => {
      const goalData = goal.toObject();
      const corpus = corpusByGoalId[goal._id.toString()] || 0;

      return {
        ...goalData,
        currentCorpus: corpus,
        projection: calculateProjection(goalData, corpus)
      };
    });

    res.status(200).json(goalsWithProjection);
  } catch (error) {
    next(error);
  }
};

export const getGoalById = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    res.status(200).json(goal);
  } catch (error) {
    next(error);
  }
};

export const getGoalDetail = async (req, res, next) => {
  try {
    const payload = await buildGoalDetailPayload(req.params.id);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const exportGoalDetailXlsx = async (req, res, next) => {
  try {
    const payload = await buildGoalDetailPayload(req.params.id);
    const {
      goal,
      projection,
      linkedHoldings,
      linkedFixedDeposits,
      linkedPhysicalCommodities,
      linkedCashAccounts,
      totalAllocated,
      allocationPercent,
      commodityContribution,
      cashContribution,
      epfContribution,
      npsContribution,
      ppfContribution
    } = payload;

    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      { metric: "Goal Name", value: goal.name || "" },
      { metric: "Type", value: goal.type || "" },
      { metric: "Target Year", value: goal.targetYear || "" },
      { metric: "Future Required", value: Number(projection.futureRequired || 0) },
      { metric: "Projected Corpus", value: Number(projection.projectedCorpus || 0) },
      { metric: "Gap", value: Number(projection.gap || 0) },
      { metric: "Status", value: projection.status || "" },
      { metric: "Total Allocated", value: Number(totalAllocated || 0) },
      { metric: "Allocation Percent", value: Number(allocationPercent || 0) },
      { metric: "Commodity Contribution", value: Number(commodityContribution || 0) },
      { metric: "Cash Contribution", value: Number(cashContribution || 0) },
      { metric: "EPF Contribution", value: Number(epfContribution || 0) },
      { metric: "NPS Contribution", value: Number(npsContribution || 0) },
      { metric: "PPF Contribution", value: Number(ppfContribution || 0) }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");

    const holdingsRows = linkedHoldings.map((holding) => ({
      instrumentName: holding.instrumentName || "",
      broker: holding.brokerDisplayName || holding.broker || "",
      quantity: Number(holding.quantity || 0),
      currentPrice: Number(holding.currentPrice || 0),
      currentValue: Number(holding.quantity || 0) * Number(holding.currentPrice || 0)
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(holdingsRows), "Holdings");

    const fdRows = linkedFixedDeposits.map((fd) => ({
      bank: fd.bank || "",
      fdName: fd.fdName || "",
      principal: Number(fd.principal || 0),
      currentValue: Number(fd.cachedValue || 0),
      maturityDate: fd.maturityDate ? new Date(fd.maturityDate).toISOString().slice(0, 10) : "",
      status: fd.status || ""
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fdRows), "FixedDeposits");

    const cashRows = linkedCashAccounts.map((account) => ({
      name: account.name || "",
      bank: account.bank || "",
      balance: Number(account.balance || 0),
      interestRate: account.interestRate === null || account.interestRate === undefined ? "" : Number(account.interestRate)
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashRows), "CashAccounts");

    const commodityRows = linkedPhysicalCommodities.map((commodity) => ({
      name: commodity.name || "",
      commodityType: commodity.commodityType || "",
      quantity: Number(commodity.quantity || 0),
      unit: commodity.unit || "",
      averageCostPerUnit: Number(commodity.averageCostPerUnit || 0),
      currentPricePerUnit: Number(commodity.currentPricePerUnit || 0),
      currentValue: Number(commodity.quantity || 0) * Number(commodity.currentPricePerUnit || 0)
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(commodityRows), "Commodities");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const safeName = String(goal.name || "goal").replace(/[^a-z0-9]+/gi, "_").toLowerCase();

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=\"${safeName}_export.xlsx\"`);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    if (typeof req.body?.name === "string") {
      const normalizedName = req.body.name.trim();

      if (normalizedName) {
        const existingGoal = await findGoalByName(normalizedName, req.params.id);

        if (existingGoal) {
          throw conflictError("Goal name already exists");
        }
      }
    }

    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    if (isTruthyFlag(req.body?.useEpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useEpf: false } }
      );
    }

    if (isTruthyFlag(req.body?.useNps)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { useNps: false } }
      );
    }

    if (isTruthyFlag(req.body?.usePpf)) {
      await Goal.updateMany(
        { _id: { $ne: goal._id } },
        { $set: { usePpf: false } }
      );
    }

    res.status(200).json(goal);
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.id);

    if (!goal) {
      throw notFoundError("Goal not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
