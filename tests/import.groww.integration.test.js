jest.mock('../core', () => {
  let store = [];

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  const ledgerService = {
    addTransaction: jest.fn(async (transaction) => {
      const doc = { ...transaction, _id: String(store.length + 1) };
      store.push(doc);
      return doc;
    }),
    getAllTransactions: jest.fn(async () => {
      return [...store].sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
    }),
    computePositions: jest.fn(async () => {
      const byIsin = new Map();

      for (const txn of store) {
        const isin = txn.isin;
        if (!byIsin.has(isin)) {
          byIsin.set(isin, {
            isin,
            symbol: txn.symbol,
            instrumentType: txn.instrumentType || 'UNKNOWN',
            totalBuyQty: 0,
            totalSellQty: 0,
            totalInvestedValue: 0
          });
        }

        const p = byIsin.get(isin);
        const qty = toNumber(txn.quantity);
        const price = toNumber(txn.price);
        const charges = toNumber(txn.charges);

        if (txn.transactionType === 'BUY') {
          p.totalBuyQty += qty;
          p.totalInvestedValue += qty * price + charges;
        } else if (txn.transactionType === 'SELL') {
          p.totalSellQty += qty;
        }
      }

      return Array.from(byIsin.values()).map((p) => {
        const remainingQty = p.totalBuyQty - p.totalSellQty;
        const avgCost = p.totalBuyQty > 0 ? p.totalInvestedValue / p.totalBuyQty : 0;
        const currentPrice = 100;

        return {
          isin: p.isin,
          symbol: p.symbol,
          instrumentType: p.instrumentType,
          remainingQty,
          avgCost,
          totalInvestedValue: p.totalInvestedValue,
          currentPrice,
          marketValue: remainingQty * currentPrice,
          unrealizedPnL: (currentPrice - avgCost) * remainingQty
        };
      });
    }),
    __reset() {
      store = [];
      ledgerService.addTransaction.mockClear();
      ledgerService.getAllTransactions.mockClear();
      ledgerService.computePositions.mockClear();
      importService.importTransactions.mockClear();
    }
  };

  const importService = {
    importTransactions: jest.fn(async ({ transactions, broker, mode = 'append' }) => {
      let deletedCount = 0;

      if (mode === 'replace') {
        const previousSize = store.length;
        store = store.filter((txn) => txn.broker !== broker);
        deletedCount = previousSize - store.length;
      }

      let importedCount = 0;
      let failedCount = 0;

      for (const transaction of transactions) {
        try {
          await ledgerService.addTransaction(transaction);
          importedCount += 1;
        } catch (_error) {
          failedCount += 1;
        }
      }

      return { deletedCount, importedCount, failedCount };
    })
  };

  return { ledgerService, importService };
});

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../app');
const { ledgerService } = require('../core');

describe('Groww import integration', () => {
  beforeEach(() => {
    ledgerService.__reset();
  });

  test('POST /import/groww imports stocks XLSX and updates transactions and positions', async () => {
    const app = createApp();
    const stocksFilePath = path.join(__dirname, '..', 'postman', 'samples', 'Groww_Stocks_Holdings_Statement_16-02-2026.xlsx');
    const stocksBuffer = fs.readFileSync(stocksFilePath);

    const importResponse = await request(app)
      .post('/import/groww?mode=append')
      .attach('file', stocksBuffer, 'Groww_Stocks_Holdings_Statement_16-02-2026.xlsx');

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.success).toBe(true);
    expect(importResponse.body.deletedCount).toBe(0);
    expect(importResponse.body.imported).toBeGreaterThan(0);
    expect(importResponse.body.failed).toBe(0);

    const transactionsResponse = await request(app).get('/transactions');
    expect(transactionsResponse.status).toBe(200);
    expect(transactionsResponse.body.data.length).toBe(importResponse.body.imported);
    expect(transactionsResponse.body.data[0]).toEqual(
      expect.objectContaining({
        broker: 'GROWW',
        transactionType: 'BUY'
      })
    );

    const positionsResponse = await request(app).get('/positions');
    expect(positionsResponse.status).toBe(200);
    expect(positionsResponse.body.data.length).toBeGreaterThan(0);
  });

  test('POST /import/groww supports separate MF and Stocks files with replace mode', async () => {
    const app = createApp();
    const stocksFilePath = path.join(__dirname, '..', 'postman', 'samples', 'Groww_Stocks_Holdings_Statement_16-02-2026.xlsx');
    const mfFilePath = path.join(__dirname, '..', 'postman', 'samples', 'Groww_Mutual_Funds_17-02-2026_17-02-2026.xlsx');
    const stocksBuffer = fs.readFileSync(stocksFilePath);
    const mfBuffer = fs.readFileSync(mfFilePath);

    const stocksAppendResponse = await request(app)
      .post('/import/groww?mode=append')
      .attach('file', stocksBuffer, 'Groww_Stocks_Holdings_Statement_16-02-2026.xlsx');

    expect(stocksAppendResponse.status).toBe(200);
    expect(stocksAppendResponse.body.imported).toBeGreaterThan(0);

    const mfAppendResponse = await request(app)
      .post('/import/groww?mode=append')
      .attach('file', mfBuffer, 'Groww_Mutual_Funds_17-02-2026_17-02-2026.xlsx');

    expect(mfAppendResponse.status).toBe(200);
    expect(mfAppendResponse.body.imported).toBeGreaterThan(0);

    const transactionsAfterAppend = await request(app).get('/transactions');
    const appendCount = transactionsAfterAppend.body.data.length;
    expect(appendCount).toBe(stocksAppendResponse.body.imported + mfAppendResponse.body.imported);
    expect(
      transactionsAfterAppend.body.data.some((txn) => txn.broker === 'GROWW' && txn.instrumentType === 'MF')
    ).toBe(true);

    const replaceResponse = await request(app)
      .post('/import/groww?mode=replace')
      .attach('file', stocksBuffer, 'Groww_Stocks_Holdings_Statement_16-02-2026.xlsx');

    expect(replaceResponse.status).toBe(200);
    expect(replaceResponse.body.deletedCount).toBe(appendCount);
    expect(replaceResponse.body.imported).toBe(stocksAppendResponse.body.imported);

    const transactionsAfterReplace = await request(app).get('/transactions');
    expect(transactionsAfterReplace.body.data.length).toBe(stocksAppendResponse.body.imported);
  });
});
