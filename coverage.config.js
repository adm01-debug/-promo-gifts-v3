export default {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/vite-env.d.ts',
    '!src/main.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    },
    './src/components/': {
      branches: 40,
      functions: 45,
      lines: 45,
      statements: 45
    },
    './src/lib/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    },
    './src/hooks/': {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  coverageReporters: ['html', 'lcov', 'text', 'text-summary', 'json', 'clover'],
  coverageDirectory: './coverage'
};
