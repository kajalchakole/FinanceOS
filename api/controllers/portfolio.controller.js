const { ledgerService } = require('../../core');
const { portfolioService } = require('../../analytics');

async function getPositions(req, res) {
  const positions = await ledgerService.computePositions();

  res.status(200).json({
    success: true,
    data: positions
  });
}

async function getPortfolioSummary(req, res) {
  const summary = await portfolioService.computePortfolioSummary();

  res.status(200).json({
    success: true,
    data: summary
  });
}

module.exports = {
  getPositions,
  getPortfolioSummary
};
