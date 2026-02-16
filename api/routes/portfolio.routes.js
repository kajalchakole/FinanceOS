const router = require('express').Router();
const { getPositions } = require('../controllers/portfolio.controller');

router.get('/positions', getPositions);

module.exports = router;
