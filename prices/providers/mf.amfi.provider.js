const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';

function parseNavValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function parseAmfiNavText(navText) {
  const navByIsin = new Map();
  const lines = String(navText || '').split(/\r?\n/);

  for (const line of lines) {
    if (!line || !line.includes(';')) {
      continue;
    }

    const columns = line.split(';').map((value) => value.trim());
    if (columns.length < 6) {
      continue;
    }

    const growthIsin = columns[1];
    const reinvestmentIsin = columns[2];
    const nav = parseNavValue(columns[4]);

    if (nav === null) {
      continue;
    }

    if (growthIsin) {
      navByIsin.set(growthIsin, nav);
    }

    if (reinvestmentIsin) {
      navByIsin.set(reinvestmentIsin, nav);
    }
  }

  return navByIsin;
}

class AmfiMfProvider {
  constructor({ fetchImpl = global.fetch, navUrl = process.env.AMFI_NAV_URL || AMFI_NAV_URL } = {}) {
    this.fetchImpl = fetchImpl;
    this.navUrl = navUrl;
  }

  async getNAV(isin) {
    if (!isin) {
      return null;
    }

    const response = await this.fetchImpl(this.navUrl);
    if (!response.ok) {
      throw new Error(`AMFI provider request failed with status ${response.status}`);
    }

    const body = await response.text();
    const navByIsin = parseAmfiNavText(body);
    return navByIsin.get(isin) ?? null;
  }
}

module.exports = {
  AmfiMfProvider,
  AMFI_NAV_URL,
  parseAmfiNavText
};
