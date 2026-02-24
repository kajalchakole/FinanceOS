import Holding from "./holding.model.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const holdingPopulate = {
  path: "goalId",
  select: "name"
};

export const createHolding = async (req, res, next) => {
  try {
    const holding = await Holding.create(req.body);
    const populatedHolding = await Holding.findById(holding._id).populate(holdingPopulate);
    res.status(201).json(populatedHolding);
  } catch (error) {
    next(error);
  }
};

export const getHoldings = async (req, res, next) => {
  try {
    const holdings = await Holding.find()
      .sort({ createdAt: -1 })
      .populate(holdingPopulate);
    res.status(200).json(holdings);
  } catch (error) {
    next(error);
  }
};

export const getHoldingById = async (req, res, next) => {
  try {
    const holding = await Holding.findById(req.params.id).populate(holdingPopulate);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(200).json(holding);
  } catch (error) {
    next(error);
  }
};

export const updateHolding = async (req, res, next) => {
  try {
    const holding = await Holding.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate(holdingPopulate);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(200).json(holding);
  } catch (error) {
    next(error);
  }
};

export const deleteHolding = async (req, res, next) => {
  try {
    const holding = await Holding.findByIdAndDelete(req.params.id);

    if (!holding) {
      throw notFoundError("Holding not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
