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
