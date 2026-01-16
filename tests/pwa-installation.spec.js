const { test, expect } = require('@playwright/test');

test.describe('PWA Installation', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant permissions needed for PWA
    await context.grantPermissions(['notifications']);
  });

  test('should show install prompt when clicking Add to Home Screen button', async ({ page, context }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for page to load and service worker to register
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Give SW time to register

    // Verify app loads correctly
    await expect(page.locator('h1')).toContainText('TradersMind Calculator');

    // Trigger beforeinstallprompt event manually (Playwright doesn't fire it automatically)
    await page.evaluate(() => {
      window.__pwaLogs = [];
      window.__pwaPromptCalled = false;

      // Override console.log to capture logs
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('[PWAInstaller]')) {
          window.__pwaLogs.push(message);
        }
        originalLog.apply(console, args);
      };

      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      beforeInstallPromptEvent.preventDefault = () => {};
      beforeInstallPromptEvent.prompt = async () => {
        console.log('[TEST] Mock prompt() called');
        window.__pwaPromptCalled = true;
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    // Wait a bit for the event to be processed
    await page.waitForTimeout(500);

    // Open settings menu
    await page.click('#settings-menu-btn');
    await page.waitForTimeout(300);

    // Verify install button is visible in menu
    const menuInstallBtn = page.locator('#menu-install-btn');
    await expect(menuInstallBtn).toBeVisible();

    // Click the install button in menu
    await menuInstallBtn.click();
    await page.waitForTimeout(300);

    // Verify modal appears
    const modal = page.locator('#pwa-install-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Get initial console logs
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[PWAInstaller]')) {
        consoleLogs.push(msg.text());
      }
    });

    // Click "Add to Home Screen" button in modal
    const installActionBtn = page.locator('#pwa-install-action');
    await expect(installActionBtn).toBeVisible();
    await installActionBtn.click();

    // Wait for the install flow to complete
    await page.waitForTimeout(1000);

    // Verify the install prompt was called
    const promptCalled = await page.evaluate(() => {
      return window.__pwaPromptCalled === true;
    });

    // This will FAIL initially because of the bug
    expect(promptCalled).toBe(true);

    // Check console logs for expected flow
    await page.waitForTimeout(500);
    const logs = await page.evaluate(() => {
      return window.__pwaLogs || [];
    });

    expect(logs).toContain('[PWAInstaller] Install action button clicked');
    expect(logs).toContain('[PWAInstaller] showInstallPrompt called');
    expect(logs).toContain('[PWAInstaller] Showing browser install prompt...');
  });

  test('should handle install acceptance correctly', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Mock the beforeinstallprompt event with accepted outcome
    await page.evaluate(() => {
      window.__pwaLogs = [];
      window.__pwaPromptCalled = false;

      // Override console.log to capture logs
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('[PWAInstaller]')) {
          window.__pwaLogs.push(message);
        }
        originalLog.apply(console, args);
      };

      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      beforeInstallPromptEvent.preventDefault = () => {};
      beforeInstallPromptEvent.prompt = async () => {
        console.log('[TEST] Mock prompt() called');
        window.__pwaPromptCalled = true;
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    await page.waitForTimeout(500);

    // Open modal via FAB button
    const fabBtn = page.locator('#install-btn');
    if (await fabBtn.isVisible()) {
      await fabBtn.click();
      await page.waitForTimeout(300);

      // Verify modal appears
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Click "Add to Home Screen" in modal
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toBeVisible();
      await installActionBtn.click();
      await page.waitForTimeout(1000);

      // Verify prompt was triggered
      const promptCalled = await page.evaluate(() => window.__pwaPromptCalled);
      expect(promptCalled).toBe(true);

      // Verify accepted outcome was handled
      const logs = await page.evaluate(() => window.__pwaLogs);
      expect(logs.some(log => log.includes('User choice: accepted') || log.includes('accepted'))).toBe(true);
    }
  });

  test('should handle install dismissal correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Mock the beforeinstallprompt event with dismissed outcome
    await page.evaluate(() => {
      window.__pwaLogs = [];
      window.__pwaPromptCalled = false;

      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('[PWAInstaller]')) {
          window.__pwaLogs.push(message);
        }
        originalLog.apply(console, args);
      };

      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      beforeInstallPromptEvent.preventDefault = () => {};
      beforeInstallPromptEvent.prompt = async () => {
        console.log('[TEST] Mock prompt() called');
        window.__pwaPromptCalled = true;
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    await page.waitForTimeout(500);

    // Click install via menu
    await page.click('#settings-menu-btn');
    await page.waitForTimeout(300);
    await page.click('#menu-install-btn');
    await page.waitForTimeout(300);

    const modal = page.locator('#pwa-install-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    await page.click('#pwa-install-action');
    await page.waitForTimeout(1000);

    // Verify prompt was called
    const promptCalled = await page.evaluate(() => window.__pwaPromptCalled);
    expect(promptCalled).toBe(true);

    // Verify dismissal was handled
    const logs = await page.evaluate(() => window.__pwaLogs);
    expect(logs.some(log => log.includes('dismissed'))).toBe(true);
  });

  test('should prevent duplicate prompts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Setup mock with prompt counter
    await page.evaluate(() => {
      window.__pwaPromptCallCount = 0;
      window.__pwaLogs = [];

      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('[PWAInstaller]')) {
          window.__pwaLogs.push(message);
        }
        originalLog.apply(console, args);
      };

      const beforeInstallPromptEvent = new Event('beforeinstallprompt');
      beforeInstallPromptEvent.preventDefault = () => {};
      beforeInstallPromptEvent.prompt = async () => {
        window.__pwaPromptCallCount++;
        console.log(`[TEST] Mock prompt() called (count: ${window.__pwaPromptCallCount})`);
        // Simulate slow prompt
        await new Promise(resolve => setTimeout(resolve, 500));
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    await page.waitForTimeout(500);

    // Test duplicate prevention by calling the method directly multiple times
    // This tests the guard logic in showInstallPrompt
    await page.evaluate(async () => {
      const installer = window.pwaInstaller;
      // Call showInstallPrompt multiple times in quick succession
      const promise1 = installer.showInstallPrompt();
      const promise2 = installer.showInstallPrompt(); // Should be guarded
      const promise3 = installer.showInstallPrompt(); // Should be guarded

      // Wait for the first one to complete
      await promise1;
      await promise2;
      await promise3;
    });

    await page.waitForTimeout(500);

    // Verify prompt was only called once
    const callCount = await page.evaluate(() => window.__pwaPromptCallCount);
    expect(callCount).toBe(1);

    // Verify guard log appears
    const logs = await page.evaluate(() => window.__pwaLogs);
    const hasGuardLog = logs.some(log => log.includes('already in progress'));
    expect(hasGuardLog).toBe(true);
  });
});
