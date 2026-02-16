const { ledgerService } = require('../../core');

async function createTransaction(req, res) {
  const savedTransaction = await ledgerService.addTransaction(req.body);

  res.status(201).json({
    success: true,
    data: savedTransaction
  });
}

async function listTransactions(req, res) {
  const transactions = await ledgerService.getAllTransactions();

  res.status(200).json({
    success: true,
    data: transactions
  });
}

module.exports = {
  createTransaction,
  listTransactions
};
