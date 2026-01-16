const { test, expect } = require('@playwright/test');

test.describe('PWA Installation', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant permissions needed for PWA
    await context.grantPermissions(['notifications']);
  });

  test('should trigger native prompt directly when beforeinstallprompt is available', async ({ page, context }) => {
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
        console.log('[PWAInstaller] Native prompt triggered!');
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

    // Click the install button in menu - should trigger prompt directly
    await menuInstallBtn.click();
    await page.waitForTimeout(500);

    // Verify the install prompt was called DIRECTLY (no modal)
    const promptCalled = await page.evaluate(() => {
      return window.__pwaPromptCalled === true;
    });

    expect(promptCalled).toBe(true);

    // Check console logs for expected flow
    const logs = await page.evaluate(() => {
      return window.__pwaLogs || [];
    });

    expect(logs.some(log => log.includes('Native prompt available, triggering directly'))).toBe(true);
    expect(logs.some(log => log.includes('Showing browser install prompt'))).toBe(true);
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
        console.log('[PWAInstaller] Native prompt triggered!');
        window.__pwaPromptCalled = true;
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    await page.waitForTimeout(500);

    // Click FAB button - should trigger prompt directly
    const fabBtn = page.locator('#install-btn');
    if (await fabBtn.isVisible()) {
      await fabBtn.click();
      await page.waitForTimeout(500);

      // Verify prompt was triggered directly (no modal)
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
        console.log('[PWAInstaller] Native prompt triggered!');
        window.__pwaPromptCalled = true;
        return Promise.resolve();
      };
      beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed' });
      beforeInstallPromptEvent.platforms = ['web'];
      window.dispatchEvent(beforeInstallPromptEvent);
    });

    await page.waitForTimeout(500);

    // Click install via menu - should trigger prompt directly
    await page.click('#settings-menu-btn');
    await page.waitForTimeout(300);
    await page.click('#menu-install-btn');
    await page.waitForTimeout(500);

    // Verify prompt was called directly
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

// Platform-specific tests for Android and iOS
test.describe('PWA Installation - Platform-Specific Behavior', () => {

  test.describe('iOS Safari', () => {
    test('should show Safari Share instructions with visual guide and "Got It" button', async ({ page }) => {
      // Set iOS user agent
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click install button (FAB or menu) - should show modal since no native prompt on iOS
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }
      await page.waitForTimeout(300);

      // Verify modal is visible (iOS always shows modal since no native prompt)
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify iOS-specific instructions are shown
      const instructions = page.locator('.install-instructions.ios');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('Install on iPhone/iPad');
      await expect(instructions).toContainText('Share');
      await expect(instructions).toContainText('Add to Home Screen');

      // Verify visual guide is present
      const visualGuide = page.locator('.ios-visual-guide');
      await expect(visualGuide).toBeVisible();

      // Verify step-by-step instructions
      const steps = page.locator('.step-container');
      await expect(steps).toHaveCount(3);
      await expect(steps.nth(0)).toContainText('Tap the Share button');
      await expect(steps.nth(1)).toContainText('Scroll down');
      await expect(steps.nth(2)).toContainText('Tap "Add" to confirm');

      // Verify "Add to Home Screen" button is visible (not hidden)
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toBeVisible();
      await expect(installActionBtn).not.toHaveClass(/hidden/);
      await expect(installActionBtn).toContainText('Add to Home Screen');

      // Verify button has correct data-action attribute
      const dataAction = await installActionBtn.getAttribute('data-action');
      expect(dataAction).toBe('ios-share');

      // Note: We don't test clicking the button since Web Share API
      // behavior is unpredictable in test environments
      console.log('[Test] iOS PWA modal structure and content verified');
    });

    test('iOS: Verify required PWA meta tags are present', async ({ page }) => {
      await page.goto('/');

      // Check apple-mobile-web-app-capable
      const appCapable = await page.$eval(
        'meta[name="apple-mobile-web-app-capable"]',
        el => el.content
      );
      expect(appCapable).toBe('yes');

      // Check status bar style
      const statusBar = await page.$eval(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
        el => el.content
      );
      expect(statusBar).toBeTruthy();

      // Check app title
      const appTitle = await page.$eval(
        'meta[name="apple-mobile-web-app-title"]',
        el => el.content
      );
      expect(appTitle).toBe('TradersMind');

      // Check apple touch icon
      const touchIcon = await page.$('link[rel="apple-touch-icon"]');
      expect(touchIcon).toBeTruthy();

      console.log('[Test] All iOS PWA meta tags verified');
    });
  });

  test.describe('Android Chrome - With Prompt Available', () => {
    test('should trigger native prompt immediately without showing modal', async ({ page }) => {
      // Set Android user agent
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Mock beforeinstallprompt event
      await page.evaluate(() => {
        window.__pwaPromptCalled = false;
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
          console.log('[PWAInstaller] Native prompt triggered!');
          window.__pwaPromptCalled = true;
          // Simulate slight delay like real browser
          await new Promise(resolve => setTimeout(resolve, 100));
          return Promise.resolve();
        };
        beforeInstallPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' });
        window.dispatchEvent(beforeInstallPromptEvent);
      });

      await page.waitForTimeout(500);

      // Click install button (FAB or menu)
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }

      // Wait for prompt to be triggered
      await page.waitForTimeout(500);

      // Verify native prompt was called DIRECTLY (without modal showing first)
      const promptCalled = await page.evaluate(() => window.__pwaPromptCalled);
      expect(promptCalled).toBe(true);

      // Verify the logs show direct triggering
      const logs = await page.evaluate(() => window.__pwaLogs);
      expect(logs.some(log => log.includes('Native prompt available, triggering directly'))).toBe(true);
      expect(logs.some(log => log.includes('Showing browser install prompt'))).toBe(true);
    });
  });

  test.describe('Android Chrome - Without Prompt (HTTP)', () => {
    test('should show HTTPS required message when on HTTP', async ({ page }) => {
      // Set Android user agent
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        });
      });

      // Note: This test assumes we're running on HTTP (default config)
      // If TEST_HTTPS=true, this test will be skipped
      const baseURL = process.env.TEST_HTTPS === 'true'
        ? 'https://localhost:8443'
        : 'http://localhost:8080';

      if (process.env.TEST_HTTPS === 'true') {
        test.skip();
        return;
      }

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click install button
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }
      await page.waitForTimeout(300);

      // Verify modal is visible
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify error state instructions
      const instructions = page.locator('.install-instructions.android.error');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('Installation Not Available');
      await expect(instructions).toContainText('HTTPS Required');

      // Verify button is hidden
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toHaveClass(/hidden/);
    });
  });

  test.describe('Android Chrome - Without Prompt (No Service Worker)', () => {
    test('should show loading message when service worker not registered', async ({ page }) => {
      // Skip if not on HTTPS (HTTP will show HTTPS error instead)
      if (process.env.TEST_HTTPS !== 'true') {
        test.skip();
        return;
      }

      // Set Android user agent
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        });

        // Mock service worker as not registered
        Object.defineProperty(navigator.serviceWorker, 'controller', {
          get: () => null,
          configurable: true
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click install button
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }
      await page.waitForTimeout(300);

      // Verify modal is visible
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify loading state instructions
      const instructions = page.locator('.install-instructions.android.error');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('Installation Loading');

      // Verify "Try Again" button is visible
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toBeVisible();
      await expect(installActionBtn).toContainText('Try Again');

      // Verify button has correct data-action attribute
      const dataAction = await installActionBtn.getAttribute('data-action');
      expect(dataAction).toBe('close');

      // Click "Try Again" and verify modal closes
      await installActionBtn.click();
      await page.waitForTimeout(300);
      await expect(modal).toHaveClass(/hidden/);
    });
  });

  test.describe('Android Chrome - Without Prompt (Browser Not Supported)', () => {
    test('should show browser not supported message', async ({ page }) => {
      // Skip if not on HTTPS
      if (process.env.TEST_HTTPS !== 'true') {
        test.skip();
        return;
      }

      // Set Android user agent and remove beforeinstallprompt support
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        });

        // Remove beforeinstallprompt support by making the property always undefined
        Object.defineProperty(window, 'onbeforeinstallprompt', {
          get: () => undefined,
          set: () => {},
          configurable: false
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click install button
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }
      await page.waitForTimeout(300);

      // Verify modal is visible
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify error state instructions
      const instructions = page.locator('.install-instructions.android.error');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('Browser Not Supported');
      await expect(instructions).toContainText('Google Chrome');
      await expect(instructions).toContainText('Microsoft Edge');

      // Verify button is hidden
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toHaveClass(/hidden/);
    });
  });

  test.describe('Android Chrome - Without Prompt (Engagement Required)', () => {
    test('should show engagement tip when prompt support exists but hasnt fired', async ({ page }) => {
      // Skip if not on HTTPS (will show HTTPS error instead)
      if (process.env.TEST_HTTPS !== 'true') {
        test.skip();
        return;
      }

      // Set Android user agent and ensure beforeinstallprompt support exists
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        });

        // Ensure beforeinstallprompt is supported (property exists)
        if (!('onbeforeinstallprompt' in window)) {
          window.onbeforeinstallprompt = null;
        }

        // Mock service worker as registered
        Object.defineProperty(navigator.serviceWorker, 'controller', {
          get: () => ({ state: 'activated' }),
          configurable: true
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Don't trigger beforeinstallprompt event (simulating engagement requirement not met)

      // Click install button
      const fabBtn = page.locator('#install-btn');
      if (await fabBtn.isVisible()) {
        await fabBtn.click();
      } else {
        await page.click('#settings-menu-btn');
        await page.waitForTimeout(300);
        await page.click('#menu-install-btn');
      }
      await page.waitForTimeout(300);

      // Verify modal is visible
      const modal = page.locator('#pwa-install-modal');
      await expect(modal).not.toHaveClass(/hidden/);

      // Verify engagement tip instructions
      const instructions = page.locator('.install-instructions.android');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('Installation Available Soon');
      await expect(instructions).toContainText('requires some interaction first');

      // Verify "Got It" button is visible
      const installActionBtn = page.locator('#pwa-install-action');
      await expect(installActionBtn).toBeVisible();
      await expect(installActionBtn).toContainText('Got It');

      // Verify button has correct data-action attribute
      const dataAction = await installActionBtn.getAttribute('data-action');
      expect(dataAction).toBe('close');

      // Click "Got It" and verify modal closes
      await installActionBtn.click();
      await page.waitForTimeout(300);
      await expect(modal).toHaveClass(/hidden/);
    });

    test('Android: Verify manifest icon configuration', async ({ page }) => {
      await page.goto('/');

      // Fetch and parse manifest
      const manifestResponse = await page.request.get('/manifest.json');
      const manifest = await manifestResponse.json();

      // Verify icons array structure
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

      // Check for separate 'any' and 'maskable' entries
      const anyIcons = manifest.icons.filter(icon => icon.purpose === 'any');
      const maskableIcons = manifest.icons.filter(icon => icon.purpose === 'maskable');

      expect(anyIcons.length).toBeGreaterThanOrEqual(2); // 192 and 512
      expect(maskableIcons.length).toBeGreaterThanOrEqual(2); // 192 and 512

      // Verify required sizes
      const sizes = manifest.icons.map(icon => icon.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');

      console.log('[Test] Manifest icon configuration verified');
    });

    test('Android: Verify service worker activates before install UI', async ({ page }) => {
      await page.goto('/');

      // Wait for service worker to register and activate
      await page.waitForFunction(() => {
        return navigator.serviceWorker.controller !== null;
      }, { timeout: 5000 });

      // Check service worker state
      const swState = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return {
          hasRegistration: !!registration,
          hasController: !!navigator.serviceWorker.controller,
          state: registration?.active?.state
        };
      });

      expect(swState.hasRegistration).toBe(true);
      expect(swState.hasController).toBe(true);
      expect(swState.state).toBe('activated');

      console.log('[Test] Service worker activated successfully');
    });

    test('Cross-platform: Verify PWA installation readiness', async ({ page }) => {
      await page.goto('/');

      const pwaReadiness = await page.evaluate(() => {
        const checks = {
          hasManifest: !!document.querySelector('link[rel="manifest"]'),
          hasServiceWorker: 'serviceWorker' in navigator,
          hasAppleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
          hasAppleWebAppCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
          isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
          hasThemeColor: !!document.querySelector('meta[name="theme-color"]')
        };

        return checks;
      });

      // All these should be true for PWA to work on real devices
      expect(pwaReadiness.hasManifest).toBe(true);
      expect(pwaReadiness.hasServiceWorker).toBe(true);
      expect(pwaReadiness.hasAppleTouchIcon).toBe(true);
      expect(pwaReadiness.hasAppleWebAppCapable).toBe(true);
      expect(pwaReadiness.isHTTPS).toBe(true);
      expect(pwaReadiness.hasThemeColor).toBe(true);

      console.log('[Test] PWA installation readiness verified for real devices');
    });
  });
});
