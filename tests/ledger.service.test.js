jest.mock('../models', () => ({
  LedgerTransaction: {
    create: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn()
  }
}));

const { LedgerTransaction } = require('../models');
const {
  addTransaction,
  getAllTransactions,
  getTransactionsByISIN,
  computePositions
} = require('../core/ledger.service');

function mockFindResult(rows) {
  const sort = jest.fn().mockResolvedValue(rows);
  LedgerTransaction.find.mockReturnValue({ sort });
  return sort;
}

describe('ledger.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('addTransaction saves BUY transaction with normalized payload', async () => {
    LedgerTransaction.create.mockResolvedValue({ _id: 'txn-1' });

    await addTransaction({
      isin: 'INFY123',
      symbol: 'INFY',
      transactionType: 'buy',
      quantity: '10',
      price: '100.5',
      charges: '2.5',
      transactionDate: '2026-01-01'
    });

    expect(LedgerTransaction.aggregate).not.toHaveBeenCalled();
    expect(LedgerTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'BUY',
        quantity: 10,
        price: 100.5,
        charges: 2.5,
        transactionDate: expect.any(Date)
      })
    );
  });

  test('addTransaction allows SELL within available quantity and reduces quantity in computed positions', async () => {
    LedgerTransaction.aggregate.mockResolvedValue([{ buyQty: 20, sellQty: 5 }]);
    LedgerTransaction.create.mockResolvedValue({ _id: 'txn-sell-1' });

    await addTransaction({
      isin: 'INFY123',
      symbol: 'INFY',
      transactionType: 'SELL',
      quantity: 10,
      price: 150,
      charges: 0,
      transactionDate: '2026-02-01'
    });

    expect(LedgerTransaction.create).toHaveBeenCalledTimes(1);
    expect(LedgerTransaction.aggregate).toHaveBeenCalledTimes(1);

    mockFindResult([
      {
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'BUY',
        quantity: 20,
        price: 100,
        charges: 0,
        transactionDate: new Date('2026-01-01')
      },
      {
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'SELL',
        quantity: 10,
        price: 150,
        charges: 0,
        transactionDate: new Date('2026-02-01')
      }
    ]);

    const positions = await computePositions();
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual(
      expect.objectContaining({
        isin: 'INFY123',
        symbol: 'INFY',
        remainingQty: 10,
        avgCost: 100,
        totalInvestedValue: 2000,
        currentPrice: null,
        unrealizedPnL: null
      })
    );
  });

  test('addTransaction throws when SELL quantity exceeds available quantity', async () => {
    LedgerTransaction.aggregate.mockResolvedValue([{ buyQty: 8, sellQty: 2 }]);

    await expect(
      addTransaction({
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'SELL',
        quantity: 10,
        price: 140,
        charges: 0,
        transactionDate: '2026-02-10'
      })
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_QUANTITY',
      statusCode: 400
    });

    expect(LedgerTransaction.create).not.toHaveBeenCalled();
  });

  test('computePositions returns weighted average results for grouped ISINs', async () => {
    mockFindResult([
      {
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'BUY',
        quantity: 10,
        price: 100,
        charges: 10,
        transactionDate: new Date('2026-01-01')
      },
      {
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'BUY',
        quantity: 5,
        price: 120,
        charges: 5,
        transactionDate: new Date('2026-01-10')
      },
      {
        isin: 'INFY123',
        symbol: 'INFY',
        transactionType: 'SELL',
        quantity: 8,
        price: 130,
        charges: 0,
        transactionDate: new Date('2026-01-15')
      },
      {
        isin: 'TCS123',
        symbol: 'TCS',
        transactionType: 'BUY',
        quantity: 2,
        price: 3000,
        charges: 20,
        transactionDate: new Date('2026-01-03')
      }
    ]);

    const positions = await computePositions();
    const infy = positions.find((item) => item.isin === 'INFY123');
    const tcs = positions.find((item) => item.isin === 'TCS123');

    expect(infy).toBeDefined();
    expect(infy.remainingQty).toBe(7);
    expect(infy.totalInvestedValue).toBe(1615);
    expect(infy.avgCost).toBeCloseTo(1615 / 15, 5);
    expect(infy.currentPrice).toBeNull();
    expect(infy.unrealizedPnL).toBeNull();

    expect(tcs).toBeDefined();
    expect(tcs.remainingQty).toBe(2);
    expect(tcs.totalInvestedValue).toBe(6020);
    expect(tcs.avgCost).toBe(3010);
  });

  test('getAllTransactions and getTransactionsByISIN query sorted by transactionDate asc', async () => {
    const firstSort = mockFindResult([{ _id: 'a' }]);
    const all = await getAllTransactions();

    expect(LedgerTransaction.find).toHaveBeenCalledWith({});
    expect(firstSort).toHaveBeenCalledWith({ transactionDate: 1 });
    expect(all).toEqual([{ _id: 'a' }]);

    const secondSort = mockFindResult([{ _id: 'b' }]);
    const byIsin = await getTransactionsByISIN('INFY123');

    expect(LedgerTransaction.find).toHaveBeenLastCalledWith({ isin: 'INFY123' });
    expect(secondSort).toHaveBeenCalledWith({ transactionDate: 1 });
    expect(byIsin).toEqual([{ _id: 'b' }]);
  });
});
