const { parse } = require('csv-parse/sync');

class BaseCsvAdapter {
  parseRows(csvBuffer) {
    if (!csvBuffer || (!Buffer.isBuffer(csvBuffer) && typeof csvBuffer !== 'string')) {
      const error = new Error('CSV input must be a Buffer or string');
      error.code = 'INVALID_CSV_INPUT';
      error.statusCode = 400;
      throw error;
    }

    return parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  }

  normalizeRow(_row, _index) {
    throw new Error('normalizeRow(row, index) must be implemented in child adapters');
  }

  extractTransactions(csvBuffer) {
    const rows = this.parseRows(csvBuffer);
    return rows
      .map((row, index) => this.normalizeRow(row, index))
      .filter(Boolean);
  }
}

module.exports = { BaseCsvAdapter };
