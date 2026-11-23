import { defineConfig, devices } from '@playwright/test'

const localPort = 41730
const accountPort = 41731
const localUrl = `http://127.0.0.1:${localPort}`
const accountUrl = `http://127.0.0.1:${accountPort}`

function server(port, url, auth = {}) {
  return {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_TURNSTILE_SITE_KEY: '', ...auth },
  }
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 3,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', testMatch: '**/shelf.spec.js', use: { ...devices['Desktop Chrome'], baseURL: localUrl } },
    { name: 'iPhone', testMatch: '**/shelf.spec.js', grepInvert: /@chromium/, use: { ...devices['iPhone 15 Pro Max'], baseURL: localUrl } },
    { name: 'accounts', testMatch: '**/accounts.spec.js', use: { ...devices['Desktop Chrome'], baseURL: accountUrl } },
  ],
  webServer: [server(localPort, localUrl), server(accountPort, accountUrl, {
    VITE_SUPABASE_URL: 'https://bookshelf-test.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testing',
  })],
})
