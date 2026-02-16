jest.mock('../core', () => ({
  ledgerService: {
    computePositions: jest.fn(),
    getAllTransactions: jest.fn()
  }
}));

const request = require('supertest');
const { ledgerService } = require('../core');
const { createApp } = require('../app');

describe('Portfolio API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /portfolio returns summary with correct math and response shape', async () => {
    const app = createApp();

    ledgerService.computePositions.mockResolvedValue([
      {
        isin: 'INFY123',
        symbol: 'INFY',
        remainingQty: 7,
        avgCost: 107.6666666667,
        totalInvestedValue: 1615,
        currentPrice: 130,
        marketValue: 910,
        unrealizedPnL: 156.3333333331
      },
      {
        isin: 'TCS123',
        symbol: 'TCS',
        remainingQty: 2,
        avgCost: 3010,
        totalInvestedValue: 6020,
        currentPrice: 3200,
        marketValue: 6400,
        unrealizedPnL: 380
      }
    ]);

    ledgerService.getAllTransactions.mockResolvedValue([
      {
        isin: 'INFY123',
        transactionType: 'BUY',
        quantity: 10,
        price: 100,
        charges: 10,
        instrumentType: 'EQUITY',
        broker: 'Zerodha'
      },
      {
        isin: 'INFY123',
        transactionType: 'BUY',
        quantity: 5,
        price: 120,
        charges: 5,
        instrumentType: 'EQUITY',
        broker: 'Zerodha'
      },
      {
        isin: 'TCS123',
        transactionType: 'BUY',
        quantity: 2,
        price: 3000,
        charges: 20,
        instrumentType: 'EQUITY',
        broker: 'Groww'
      }
    ]);

    const response = await request(app).get('/portfolio');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          totalMarketValue: 7310,
          totalInvested: 7635,
          totalUnrealizedPnL: expect.any(Number),
          totalUnrealizedPnLPercent: expect.any(Number)
        }),
        allocationByInstrumentType: expect.any(Array),
        brokerSplit: expect.any(Array)
      })
    );

    expect(response.body.data.totals.totalUnrealizedPnL).toBeCloseTo(536.3333333331, 5);
    expect(response.body.data.totals.totalUnrealizedPnLPercent).toBeCloseTo((536.3333333331 / 7635) * 100, 5);

    expect(response.body.data.allocationByInstrumentType).toEqual([
      expect.objectContaining({
        instrumentType: 'EQUITY',
        marketValue: 7310,
        allocationPercent: 100
      })
    ]);

    expect(response.body.data.brokerSplit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          broker: 'Zerodha',
          totalInvested: 1615,
          transactionCount: 2
        }),
        expect.objectContaining({
          broker: 'Groww',
          totalInvested: 6020,
          transactionCount: 1
        })
      ])
    );
  });
});
