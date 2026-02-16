jest.mock('../core', () => ({
  ledgerService: {
    addTransaction: jest.fn(),
    getAllTransactions: jest.fn(),
    computePositions: jest.fn()
  }
}));

const request = require('supertest');
const { ledgerService } = require('../core');
const { createApp } = require('../app');

describe('Ledger API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /transactions saves transaction and returns success response shape', async () => {
    const app = createApp();
    const payload = {
      isin: 'INFY123',
      symbol: 'INFY',
      transactionType: 'BUY',
      quantity: 10,
      price: 100,
      charges: 2,
      transactionDate: '2026-02-16'
    };
    const savedTransaction = {
      _id: 'txn-1',
      ...payload
    };

    ledgerService.addTransaction.mockResolvedValue(savedTransaction);

    const response = await request(app).post('/transactions').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: savedTransaction
    });
    expect(ledgerService.addTransaction).toHaveBeenCalledWith(payload);
  });

  test('GET /positions returns computed positions with expected response shape', async () => {
    const app = createApp();
    const positions = [
      {
        isin: 'INFY123',
        symbol: 'INFY',
        remainingQty: 7,
        avgCost: 107.6667,
        totalInvestedValue: 1615,
        currentPrice: null,
        unrealizedPnL: null
      }
    ];

    ledgerService.computePositions.mockResolvedValue(positions);

    const response = await request(app).get('/positions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: positions
    });
    expect(ledgerService.computePositions).toHaveBeenCalledTimes(1);
  });

  test('GET /transactions returns all transactions sorted response payload', async () => {
    const app = createApp();
    const transactions = [
      {
        _id: 'txn-1',
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'BUY',
        quantity: 10,
        transactionDate: '2026-01-01T00:00:00.000Z'
      },
      {
        _id: 'txn-2',
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'SELL',
        quantity: 2,
        transactionDate: '2026-01-10T00:00:00.000Z'
      }
    ];

    ledgerService.getAllTransactions.mockResolvedValue(transactions);

    const response = await request(app).get('/transactions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: transactions
    });
    expect(ledgerService.getAllTransactions).toHaveBeenCalledTimes(1);
  });
});
