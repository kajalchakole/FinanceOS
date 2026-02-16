function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'financeos-api',
    timestamp: new Date().toISOString()
  });
}

module.exports = { getHealth };
