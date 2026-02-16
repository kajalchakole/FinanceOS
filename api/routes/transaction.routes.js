const router = require('express').Router();
const {
  createTransaction,
  listTransactions
} = require('../controllers/transaction.controller');

router.post('/', createTransaction);
router.get('/', listTransactions);

module.exports = router;
