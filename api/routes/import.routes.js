const router = require('express').Router();
const { importZerodhaCsv, importZerodhaHoldings } = require('../controllers/import.controller');
const { uploadZerodhaCsv, uploadZerodhaHoldingsXlsx } = require('../middlewares/upload.middleware');

router.post('/zerodha', uploadZerodhaCsv, importZerodhaCsv);
router.post('/zerodha/holdings', uploadZerodhaHoldingsXlsx, importZerodhaHoldings);

module.exports = router;
