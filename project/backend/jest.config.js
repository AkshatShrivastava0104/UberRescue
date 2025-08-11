module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/seeders/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};