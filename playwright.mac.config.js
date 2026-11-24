import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/mac',
  workers: 1,
  timeout: 120000,
  outputDir: 'test-results/mac',
  use: { actionTimeout: 10000 },
})
