import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/integration/setup.ts'],
    include: ['./src/__tests__/integration/**/*.test.ts'],
    // Run tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Increase timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
  },
})
