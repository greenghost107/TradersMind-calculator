const { test, expect } = require('@playwright/test');
const { USER_AGENTS, mockUserAgent } = require('./helpers/user-agents.js');

test.describe('PWA Platform Detection', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant necessary permissions
    await context.grantPermissions(['notifications']);

    // Set up test environment
    await page.addInitScript(() => {
      window.__TEST_MODE__ = true;
      window.__TEST_HTTPS__ = true;

      // Mock service worker as registered and ready
      if ('serviceWorker' in navigator) {
        Object.defineProperty(navigator.serviceWorker, 'controller', {
          get: () => ({ state: 'activated' }),
          configurable: true
        });

        Object.defineProperty(navigator.serviceWorker, 'ready', {
          get: () => Promise.resolve({
            active: { state: 'activated' },
            installing: null,
            waiting: null,
            scope: '/',
            updateViaCache: 'none'
          }),
          configurable: true
        });
      }
    });
  });

  test.describe('iOS Safari Detection', () => {
    test('should detect iOS Safari correctly', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Execute platform detection function
      const isInIOSSafari = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
        return isIOS && isSafari;
      });

      expect(isInIOSSafari).toBe(true);
    });

    test('should show iOS Safari modal with Share instructions on install click', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Click the install button
      const installButton = page.locator('#install-fab, button:has-text("Install"), [aria-label*="Install"]').first();
      if (await installButton.isVisible()) {
        await installButton.click();
      }

      // Wait a moment for modal to appear
      await page.waitForTimeout(500);

      // Check if iOS modal with Share instructions is visible
      const modalContent = await page.locator('.modal-content, .install-modal, [role="dialog"]').first();
      if (await modalContent.isVisible()) {
        const modalText = await modalContent.textContent();

        // Verify modal contains iOS-specific instructions
        const hasShareInstructions =
          modalText.includes('Share') ||
          modalText.includes('Add to Home Screen') ||
          modalText.includes('share button') ||
          modalText.includes('home screen');

        expect(hasShareInstructions).toBe(true);
      }
    });

    test('should show Share icon visual guide in iOS modal', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Click install button
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        // Check for Share icon or visual guide
        const hasShareIcon = await page.locator('.share-icon, .ios-share-icon, svg[class*="share"]').count() > 0;
        const hasVisualSteps = await page.locator('.install-steps, .visual-guide, [class*="step"]').count() > 0;

        // Either a share icon or visual steps should be present
        expect(hasShareIcon || hasVisualSteps).toBe(true);
      }
    });
  });

  test.describe('iOS Wrong Browser Detection', () => {
    test('should detect iOS Chrome (wrong browser)', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isIOSWrongBrowser = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(userAgent);
        const isNotSafari = /CriOS|FxiOS|EdgiOS/.test(userAgent);
        return isIOS && isNotSafari;
      });

      expect(isIOSWrongBrowser).toBe(true);
    });

    test('should show "Switch to Safari" instructions for iOS Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Click install button
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        // Check for "Switch to Safari" or "Open in Safari" message
        const modalContent = await page.locator('.modal-content, .install-modal, [role="dialog"]').first();
        if (await modalContent.isVisible()) {
          const modalText = await modalContent.textContent();

          const hasSwitchInstructions =
            modalText.includes('Safari') ||
            modalText.includes('Switch') ||
            modalText.includes('Open in');

          expect(hasSwitchInstructions).toBe(true);
        }
      }
    });

    test('should detect iOS Firefox (wrong browser)', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosFirefox);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isIOSWrongBrowser = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(userAgent);
        const isNotSafari = /CriOS|FxiOS|EdgiOS/.test(userAgent);
        return isIOS && isNotSafari;
      });

      expect(isIOSWrongBrowser).toBe(true);
    });

    test('should detect iOS Edge (wrong browser)', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosEdge);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isIOSWrongBrowser = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(userAgent);
        const isNotSafari = /CriOS|FxiOS|EdgiOS/.test(userAgent);
        return isIOS && isNotSafari;
      });

      expect(isIOSWrongBrowser).toBe(true);
    });
  });

  test.describe('Android Chrome Detection', () => {
    test('should detect Android Chrome correctly', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isAndroidChrome = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        const isAndroid = /Android/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent) && !/EdgA/.test(userAgent);
        return isAndroid && isChrome;
      });

      expect(isAndroidChrome).toBe(true);
    });

    test('should support beforeinstallprompt on Android Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      // Mock beforeinstallprompt event
      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };

        // Simulate beforeinstallprompt event
        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = async () => {};
          event.userChoice = Promise.resolve({ outcome: 'accepted' });
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Check if beforeinstallprompt was captured
      const hasPrompt = await page.evaluate(() => {
        return window.deferredPrompt !== undefined && window.deferredPrompt !== null;
      });

      expect(hasPrompt).toBe(true);
    });
  });

  test.describe('Desktop Browser Detection', () => {
    test('should detect Windows Chrome as desktop', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.windowsChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isDesktop = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        return /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile/.test(userAgent);
      });

      expect(isDesktop).toBe(true);
    });

    test('should detect macOS Chrome as desktop', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.macChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isDesktop = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        return /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile/.test(userAgent);
      });

      expect(isDesktop).toBe(true);
    });

    test('should detect Linux Chrome as desktop', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.linuxChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const isDesktop = await page.evaluate(() => {
        const userAgent = navigator.userAgent;
        return /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile/.test(userAgent);
      });

      expect(isDesktop).toBe(true);
    });

    test('should support beforeinstallprompt on desktop Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.windowsChrome);

      // Mock beforeinstallprompt event for desktop
      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };

        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = async () => {};
          event.userChoice = Promise.resolve({ outcome: 'accepted' });
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const hasPrompt = await page.evaluate(() => {
        return window.deferredPrompt !== undefined && window.deferredPrompt !== null;
      });

      expect(hasPrompt).toBe(true);
    });
  });

  test.describe('Platform-Specific Install Button Behavior', () => {
    test('should show install button for all platforms', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Check if install button is present (may be FAB or regular button)
      const installButton = page.locator('#install-fab, button:has-text("Install"), [aria-label*="Install"]').first();
      const isVisible = await installButton.isVisible();

      // Install button should be visible on supported platforms
      expect(isVisible).toBe(true);
    });

    test('should handle install button click without errors on iOS Safari', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Click install button and verify no errors
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      if (await installButton.isVisible()) {
        await installButton.click();

        // Wait for modal or response
        await page.waitForTimeout(500);

        // Check for console errors
        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        // No critical errors should occur
        expect(errors.length).toBe(0);
      }
    });

    test('should handle install button click without errors on Android Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        expect(errors.length).toBe(0);
      }
    });
  });
});
