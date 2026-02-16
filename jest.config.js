module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  collectCoverageFrom: ['api/**/*.js', 'config/**/*.js', 'app.js', 'server.js']
};
