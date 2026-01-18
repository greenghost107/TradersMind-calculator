const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_HTTPS === 'true'
      ? 'https://localhost:8443'
      : 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true, // For self-signed certs in testing
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iOS Safari',
      use: {
        ...devices['iPhone 13'],
        // iOS Safari supports service workers starting iOS 11.3+
      },
    },
    {
      name: 'iOS Safari iPad',
      use: {
        ...devices['iPad Pro'],
      },
    },
    {
      name: 'Android Chrome',
      use: {
        ...devices['Pixel 5'],
        // Android Chrome supports beforeinstallprompt and PWA installation
      },
    },
    {
      name: 'Desktop Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
  ],
  webServer: {
    command: process.env.TEST_HTTPS === 'true'
      ? 'npm run dev:https'
      : 'npm run dev',
    url: process.env.TEST_HTTPS === 'true'
      ? 'https://localhost:8443'
      : 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    ignoreHTTPSErrors: true,
  },
});
