const router = require('express').Router();
const { importGroww, importZerodhaCsv, importZerodhaHoldings } = require('../controllers/import.controller');
const { uploadSpreadsheet, uploadZerodhaCsv, uploadZerodhaHoldingsXlsx } = require('../middlewares/upload.middleware');

router.post('/groww', uploadSpreadsheet, importGroww);
router.post('/zerodha', uploadZerodhaCsv, importZerodhaCsv);
router.post('/zerodha/holdings', uploadZerodhaHoldingsXlsx, importZerodhaHoldings);

module.exports = router;
