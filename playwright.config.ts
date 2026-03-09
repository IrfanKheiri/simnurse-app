import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for SimNurse visual layout audit.
 * Covers:
 *  - Standard breakpoint viewports: 320 / 768 / 1024 / 1920 px
 *  - Device emulation: iPhone 14 Pro Max, iPad Pro
 *  - Cross-browser: Chromium, Firefox, WebKit
 *  - Visual regression via snapshot comparisons
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  /* Max test timeout */
  timeout: 30_000,
  expect: {
    /* Screenshot comparison threshold — 0.15 = 15% pixel diff allowed */
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },

  /* Run tests in parallel */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    /* Disable animations so screenshots are deterministic */
    launchOptions: {
      args: ['--disable-web-security'],
    },
  },

  /* Output directory for screenshots */
  snapshotDir: './tests/snapshots',

  projects: [
    // ── Standard breakpoint viewports ──────────────────────────────────────

    {
      name: 'mobile-320-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: 'mobile-375-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: 'tablet-768-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'desktop-1024-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'desktop-1920-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // ── Real device emulation ───────────────────────────────────────────────

    {
      name: 'iphone-14-pro-max',
      use: {
        ...devices['iPhone 14 Pro Max'],
      },
    },
    {
      name: 'ipad-pro',
      use: {
        ...devices['iPad Pro 11'],
      },
    },

    // ── Cross-browser at standard desktop ──────────────────────────────────

    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'desktop-webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  /* Start dev server before tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
