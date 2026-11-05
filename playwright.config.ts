import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the production build (`vite preview` serves dist/), so build first:
// `npm test` does both. In CI the deploy workflow builds once with BASE_PATH=/emberwake/ and tests
// that exact build before publishing it.
const BASE = process.env.BASE_PATH ?? '/';
const PORT = 4173;

export default defineConfig({
  testDir: 'tests',
  // software WebGL (SwiftShader) is slow, and the gates take real seconds
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // every page renders WebGL in software (SwiftShader): too many at once and screenshots take 20s+
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // CI runners have no GPU: let Chromium fall back to software WebGL instead of the static edition
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // touch, the 1280px plate set and the portrait layout. At 1x density: software WebGL at the
    // Pixel's real 2.6x is four times the work, and plate size depends on CSS pixels, not density.
    { name: 'phone', use: { ...devices['Pixel 7'], deviceScaleFactor: 1 } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
