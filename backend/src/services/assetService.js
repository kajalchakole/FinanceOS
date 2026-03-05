import Asset from "../models/Asset.js";

const notFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

export const createAsset = async (data) => {
  const asset = await Asset.create(data);
  return asset.toObject();
};

export const getAllAssets = async () => {
  return Asset.find().sort({ createdAt: -1 }).lean();
};

export const updateAsset = async (assetId, data) => {
  const updated = await Asset.findByIdAndUpdate(assetId, data, {
    new: true,
    runValidators: true
  }).lean();

  if (!updated) {
    throw notFoundError("Asset not found");
  }

  return updated;
};

export const deleteAsset = async (assetId) => {
  const deleted = await Asset.findByIdAndDelete(assetId).lean();

  if (!deleted) {
    throw notFoundError("Asset not found");
  }

  return deleted;
};

export const getTotalAssetValue = async () => {
  const aggregation = await Asset.aggregate([
    {
      $group: {
        _id: null,
        totalAssetsValue: { $sum: "$currentValue" }
      }
    }
  ]);

  return Number(aggregation[0]?.totalAssetsValue || 0);
};
