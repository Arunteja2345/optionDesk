module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }]
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/$1',
  },
}