const router = require('express').Router();
const { getPositions, getPortfolioSummary } = require('../controllers/portfolio.controller');

router.get('/portfolio', getPortfolioSummary);
router.get('/positions', getPositions);

module.exports = router;
