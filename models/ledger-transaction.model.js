const mongoose = require('mongoose');

const ledgerTransactionSchema = new mongoose.Schema(
  {
    isin: { type: String, required: true, trim: true, index: true },
    symbol: { type: String, required: true, trim: true },
    transactionType: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL', 'DIVIDEND', 'SPLIT']
    },
    quantity: { type: Number, required: true, min: 0.000001 },
    price: { type: Number, default: 0 },
    charges: { type: Number, default: 0 },
    transactionDate: { type: Date, required: true, index: true }
  },
  {
    timestamps: true,
    collection: 'ledger_transactions'
  }
);

ledgerTransactionSchema.index({ isin: 1, transactionDate: 1 });

const LedgerTransaction = mongoose.model('LedgerTransaction', ledgerTransactionSchema);

module.exports = { LedgerTransaction };
