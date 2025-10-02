import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    maxConcurrency: 1,
    fileParallelism: false,
    isolate: false
  }
})