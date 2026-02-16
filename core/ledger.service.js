const { LedgerTransaction } = require('../models');
const { defaultPriceService } = require('../prices/price.service');

const REQUIRED_FIELDS = ['isin', 'symbol', 'transactionType', 'quantity', 'transactionDate'];
const SUPPORTED_TRANSACTION_TYPES = new Set(['BUY', 'SELL', 'DIVIDEND', 'SPLIT']);

function createServiceError(message, code, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizeTransactionPayload(transactionData) {
  if (!transactionData || typeof transactionData !== 'object') {
    throw createServiceError('Transaction payload must be an object', 'INVALID_TRANSACTION_PAYLOAD');
  }

  for (const field of REQUIRED_FIELDS) {
    if (transactionData[field] === undefined || transactionData[field] === null || transactionData[field] === '') {
      throw createServiceError(`Missing required field: ${field}`, 'MISSING_REQUIRED_FIELD');
    }
  }

  const transactionType = String(transactionData.transactionType).toUpperCase();
  if (!SUPPORTED_TRANSACTION_TYPES.has(transactionType)) {
    throw createServiceError('Unsupported transaction type', 'INVALID_TRANSACTION_TYPE');
  }

  const quantity = Number(transactionData.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw createServiceError('Quantity must be a positive number', 'INVALID_QUANTITY');
  }

  const transactionDate = new Date(transactionData.transactionDate);
  if (Number.isNaN(transactionDate.getTime())) {
    throw createServiceError('Invalid transactionDate', 'INVALID_TRANSACTION_DATE');
  }

  const price = transactionData.price === undefined ? 0 : Number(transactionData.price);
  const charges = transactionData.charges === undefined ? 0 : Number(transactionData.charges);

  if (!Number.isFinite(price) || price < 0) {
    throw createServiceError('Price must be a non-negative number', 'INVALID_PRICE');
  }

  if (!Number.isFinite(charges) || charges < 0) {
    throw createServiceError('Charges must be a non-negative number', 'INVALID_CHARGES');
  }

  return {
    ...transactionData,
    isin: String(transactionData.isin).trim(),
    symbol: String(transactionData.symbol).trim(),
    transactionType,
    quantity,
    price,
    charges,
    transactionDate
  };
}

async function getAvailableQuantity(isin) {
  const aggregates = await LedgerTransaction.aggregate([
    { $match: { isin } },
    {
      $group: {
        _id: '$isin',
        buyQty: {
          $sum: {
            $cond: [{ $eq: ['$transactionType', 'BUY'] }, '$quantity', 0]
          }
        },
        sellQty: {
          $sum: {
            $cond: [{ $eq: ['$transactionType', 'SELL'] }, '$quantity', 0]
          }
        }
      }
    }
  ]);

  if (!aggregates.length) {
    return 0;
  }

  return Number(aggregates[0].buyQty || 0) - Number(aggregates[0].sellQty || 0);
}

async function addTransaction(transactionData) {
  const normalizedTransaction = normalizeTransactionPayload(transactionData);

  if (normalizedTransaction.transactionType === 'SELL') {
    const availableQuantity = await getAvailableQuantity(normalizedTransaction.isin);

    if (normalizedTransaction.quantity > availableQuantity) {
      throw createServiceError(
        `Insufficient quantity for SELL. Available: ${availableQuantity}, requested: ${normalizedTransaction.quantity}`,
        'INSUFFICIENT_QUANTITY',
        400
      );
    }
  }

  return LedgerTransaction.create(normalizedTransaction);
}

async function getAllTransactions() {
  return LedgerTransaction.find({}).sort({ transactionDate: 1 });
}

async function getTransactionsByISIN(isin) {
  return LedgerTransaction.find({ isin }).sort({ transactionDate: 1 });
}

function toNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

async function computePositions(priceService = defaultPriceService) {
  const transactions = await getAllTransactions();
  const positionMap = new Map();

  for (const transaction of transactions) {
    const isin = transaction.isin;
    const symbol = transaction.symbol;
    const quantity = toNumber(transaction.quantity);
    const price = toNumber(transaction.price);
    const charges = toNumber(transaction.charges);
    const transactionValue = quantity * price + charges;

    if (!positionMap.has(isin)) {
      positionMap.set(isin, {
        isin,
        symbol,
        instrumentType: transaction.instrumentType || 'UNKNOWN',
        totalBuyQty: 0,
        totalSellQty: 0,
        totalInvestedValue: 0,
        totalRealizedValue: 0
      });
    }

    const position = positionMap.get(isin);

    if (transaction.transactionType === 'BUY') {
      position.totalBuyQty += quantity;
      position.totalInvestedValue += transactionValue;
      continue;
    }

    if (transaction.transactionType === 'SELL') {
      position.totalSellQty += quantity;
      position.totalRealizedValue += transactionValue;
    }
  }

  const basePositions = Array.from(positionMap.values()).map((position) => {
    const remainingQty = position.totalBuyQty - position.totalSellQty;
    const avgCost = remainingQty > 0 && position.totalBuyQty > 0 ? position.totalInvestedValue / position.totalBuyQty : 0;

    return {
      isin: position.isin,
      symbol: position.symbol,
      instrumentType: position.instrumentType,
      remainingQty,
      avgCost,
      totalInvestedValue: position.totalInvestedValue,
      currentPrice: null,
      marketValue: null,
      unrealizedPnL: null
    };
  });

  return Promise.all(
    basePositions.map(async (position) => {
      const currentPrice = await priceService.getCurrentPrice({
        isin: position.isin,
        symbol: position.symbol,
        instrumentType: position.instrumentType
      });
      const marketValue = position.remainingQty * currentPrice;
      const unrealizedPnL = (currentPrice - position.avgCost) * position.remainingQty;

      return {
        ...position,
        currentPrice,
        marketValue,
        unrealizedPnL
      };
    })
  );
}

module.exports = {
  addTransaction,
  getAllTransactions,
  getTransactionsByISIN,
  computePositions
};
