import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      include: ['src/lib/**/*.js', 'desktop/google-auth.cjs'],
      reporter: ['text', 'html'],
    },
  },
})
