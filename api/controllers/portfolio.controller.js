const { ledgerService } = require('../../core');

async function getPositions(req, res) {
  const positions = await ledgerService.computePositions();

  res.status(200).json({
    success: true,
    data: positions
  });
}

module.exports = {
  getPositions
};
