const { PriceService } = require('../prices/price.service');
const { parseAmfiNavText, AmfiMfProvider } = require('../prices/providers/mf.amfi.provider');
const { YahooEquityProvider } = require('../prices/providers/equity.yahoo.provider');

describe('Price providers and service', () => {
  test('parseAmfiNavText maps ISIN columns to NAV', () => {
    const sample = [
      'Open Ended Schemes ( Equity Scheme - Large Cap Fund )',
      '119551;INF109K01QX0;INF109K01QY8;Axis Bluechip Fund - Direct Plan - Growth;58.12;16-Feb-2026'
    ].join('\n');

    const navMap = parseAmfiNavText(sample);

    expect(navMap.get('INF109K01QX0')).toBeCloseTo(58.12, 5);
    expect(navMap.get('INF109K01QY8')).toBeCloseTo(58.12, 5);
  });

  test('AmfiMfProvider.getNAV fetches and resolves NAV by ISIN', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '100001;INF000000001;INF000000002;Sample Fund;123.45;16-Feb-2026'
    });

    const provider = new AmfiMfProvider({ fetchImpl });
    const nav = await provider.getNAV('INF000000001');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(nav).toBe(123.45);
  });

  test('YahooEquityProvider.getPrice returns regularMarketPrice', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quoteResponse: {
          result: [{ symbol: 'INFY.NS', regularMarketPrice: 1675.2 }]
        }
      })
    });

    const provider = new YahooEquityProvider({ fetchImpl });
    const price = await provider.getPrice('INFY.NS');

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('symbols=INFY.NS'));
    expect(price).toBe(1675.2);
  });

  test('PriceService routes by instrumentType and applies 5-minute TTL cache', async () => {
    let now = 0;
    const mfProvider = { getNAV: jest.fn().mockResolvedValue(43.21) };
    const equityProvider = { getPrice: jest.fn().mockResolvedValue(2100) };
    const mockProvider = { getCurrentPrice: jest.fn().mockResolvedValue(100) };

    const service = new PriceService({
      mfProvider,
      equityProvider,
      mockProvider,
      now: () => now
    });

    const mfPrice1 = await service.getCurrentPrice({ isin: 'INF0001', symbol: 'MF-1', instrumentType: 'MF' });
    const mfPrice2 = await service.getCurrentPrice({ isin: 'INF0001', symbol: 'MF-1', instrumentType: 'MF' });

    expect(mfPrice1).toBe(43.21);
    expect(mfPrice2).toBe(43.21);
    expect(mfProvider.getNAV).toHaveBeenCalledTimes(1);

    now = 5 * 60 * 1000 + 1;
    const mfPrice3 = await service.getCurrentPrice({ isin: 'INF0001', symbol: 'MF-1', instrumentType: 'MF' });
    expect(mfPrice3).toBe(43.21);
    expect(mfProvider.getNAV).toHaveBeenCalledTimes(2);

    const eqPrice = await service.getCurrentPrice({ isin: 'INFYISIN', symbol: 'INFY.NS', instrumentType: 'EQUITY' });
    expect(eqPrice).toBe(2100);
    expect(equityProvider.getPrice).toHaveBeenCalledWith('INFY.NS');
    expect(mockProvider.getCurrentPrice).not.toHaveBeenCalled();
  });

  test('PriceService falls back to mock provider when real providers do not return a price', async () => {
    const service = new PriceService({
      mfProvider: { getNAV: jest.fn().mockResolvedValue(null) },
      equityProvider: { getPrice: jest.fn().mockResolvedValue(null) },
      mockProvider: { getCurrentPrice: jest.fn().mockResolvedValue(100) }
    });

    const price = await service.getCurrentPrice({ isin: 'UNK', symbol: 'UNK', instrumentType: 'COMMODITY' });

    expect(price).toBe(100);
  });

  test('PriceService falls back to mock provider when provider throws', async () => {
    const service = new PriceService({
      mfProvider: { getNAV: jest.fn().mockRejectedValue(new Error('AMFI 503')) },
      equityProvider: { getPrice: jest.fn().mockRejectedValue(new Error('Yahoo 401')) },
      mockProvider: { getCurrentPrice: jest.fn().mockResolvedValue(100) }
    });

    const equityPrice = await service.getCurrentPrice({
      isin: 'INFY123',
      symbol: 'INFY.NS',
      instrumentType: 'EQUITY'
    });
    const mfPrice = await service.getCurrentPrice({
      isin: 'INF200K01264',
      symbol: 'HDFC-MF',
      instrumentType: 'MF'
    });

    expect(equityPrice).toBe(100);
    expect(mfPrice).toBe(100);
  });
});
