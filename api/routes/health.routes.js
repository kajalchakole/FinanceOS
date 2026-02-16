const { getHealth } = require('../controllers/health.controller');

const router = require('express').Router();

router.get('/', getHealth);

module.exports = router;
