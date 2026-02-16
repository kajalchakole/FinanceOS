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

describe('Zerodha CSV import integration', () => {
  beforeEach(() => {
    ledgerService.__reset();
  });

  test('POST /import/zerodha imports CSV rows and updates transactions and positions', async () => {
    const app = createApp();
    const csv = [
      'Symbol,ISIN,Trade Date,Trade Type,Quantity,Price,Charges',
      'INFY,INFY123,2026-02-10,BUY,10,1500,20',
      'INFY,INFY123,2026-02-12,BUY,5,1600,10',
      'INFY,INFY123,2026-02-15,SELL,3,1700,5'
    ].join('\n');

    const importResponse = await request(app)
      .post('/import/zerodha')
      .attach('file', Buffer.from(csv), 'zerodha.csv');

    expect(importResponse.status).toBe(200);
    expect(importResponse.body).toEqual({
      success: true,
      deletedCount: 0,
      imported: 3,
      failed: 0
    });
    expect(ledgerService.addTransaction).toHaveBeenCalledTimes(3);

    const transactionsResponse = await request(app).get('/transactions');
    expect(transactionsResponse.status).toBe(200);
    expect(transactionsResponse.body.success).toBe(true);
    expect(transactionsResponse.body.data).toHaveLength(3);
    expect(transactionsResponse.body.data[0]).toEqual(
      expect.objectContaining({
        broker: 'ZERODHA',
        instrumentType: 'EQUITY',
        transactionType: 'BUY'
      })
    );

    const positionsResponse = await request(app).get('/positions');
    expect(positionsResponse.status).toBe(200);
    expect(positionsResponse.body.success).toBe(true);
    expect(positionsResponse.body.data).toHaveLength(1);
    expect(positionsResponse.body.data[0]).toEqual(
      expect.objectContaining({
        isin: 'INFY123',
        remainingQty: 12
      })
    );
  });

  test('POST /import/zerodha rejects non-csv upload', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/import/zerodha')
      .attach('file', Buffer.from('not csv'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  test('POST /import/zerodha/holdings imports Zerodha holdings XLSX and updates positions', async () => {
    const app = createApp();
    const sampleFilePath = path.join(__dirname, '..', 'postman', 'samples', 'holdings-VPW659.xlsx');
    const sampleBuffer = fs.readFileSync(sampleFilePath);

    const importResponse = await request(app)
      .post('/import/zerodha/holdings')
      .attach('file', sampleBuffer, 'holdings-VPW659.xlsx');

    expect(importResponse.status).toBe(200);
    expect(importResponse.body.success).toBe(true);
    expect(importResponse.body.deletedCount).toBe(0);
    expect(importResponse.body.imported).toBeGreaterThan(0);
    expect(importResponse.body.failed).toBe(0);

    const transactionsResponse = await request(app).get('/transactions');
    expect(transactionsResponse.status).toBe(200);
    expect(transactionsResponse.body.success).toBe(true);
    expect(transactionsResponse.body.data.length).toBe(importResponse.body.imported);
    expect(transactionsResponse.body.data[0]).toEqual(
      expect.objectContaining({
        broker: 'ZERODHA',
        transactionType: 'BUY'
      })
    );

    const positionsResponse = await request(app).get('/positions');
    expect(positionsResponse.status).toBe(200);
    expect(positionsResponse.body.success).toBe(true);
    expect(positionsResponse.body.data.length).toBeGreaterThan(0);
  });

  test('holdings import append then replace deletes previous broker transactions', async () => {
    const app = createApp();
    const sampleFilePath = path.join(__dirname, '..', 'postman', 'samples', 'holdings-VPW659.xlsx');
    const sampleBuffer = fs.readFileSync(sampleFilePath);

    const appendResponse = await request(app)
      .post('/import/zerodha/holdings?mode=append')
      .attach('file', sampleBuffer, 'holdings-VPW659.xlsx');

    expect(appendResponse.status).toBe(200);
    expect(appendResponse.body.success).toBe(true);
    expect(appendResponse.body.deletedCount).toBe(0);
    expect(appendResponse.body.imported).toBeGreaterThan(0);

    const transactionsAfterAppend = await request(app).get('/transactions');
    expect(transactionsAfterAppend.status).toBe(200);
    const appendCount = transactionsAfterAppend.body.data.length;
    expect(appendCount).toBe(appendResponse.body.imported);

    const replaceResponse = await request(app)
      .post('/import/zerodha/holdings?mode=replace')
      .attach('file', sampleBuffer, 'holdings-VPW659.xlsx');

    expect(replaceResponse.status).toBe(200);
    expect(replaceResponse.body.success).toBe(true);
    expect(replaceResponse.body.deletedCount).toBe(appendCount);
    expect(replaceResponse.body.imported).toBeGreaterThan(0);

    const transactionsAfterReplace = await request(app).get('/transactions');
    expect(transactionsAfterReplace.status).toBe(200);
    expect(transactionsAfterReplace.body.data.length).toBe(replaceResponse.body.imported);
  });
});
