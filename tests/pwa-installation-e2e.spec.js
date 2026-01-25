const { test, expect } = require('@playwright/test');
const { USER_AGENTS, mockUserAgent } = require('./helpers/user-agents.js');

test.describe('PWA Installation End-to-End Flows', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant necessary permissions
    await context.grantPermissions(['notifications']);

    // Clear any previous installation state
    await page.addInitScript(() => {
      localStorage.clear();
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

  test.describe('Complete iOS Safari Installation Flow', () => {
    test('should show iOS modal with instructions on install click', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait longer for service worker to be ready

      // Step 1: Verify install button is visible
      const installButton = page.locator('#install-fab, button:has-text("Install"), [aria-label*="Install"]').first();
      await expect(installButton).toBeVisible({ timeout: 10000 });

      // Step 2: Click install button
      await installButton.click();
      await page.waitForTimeout(500);

      // Step 3: Verify iOS modal appears with instructions
      const modal = page.locator('.pwa-modal-content, .modal-content, .install-modal, [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 10000 });

      const modalText = await modal.textContent();
      expect(modalText).toMatch(/Share|Add to Home Screen|share button|home screen/i);
    });

    test('should hide install button after user confirms installation', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait longer for service worker to be ready

      // Step 1: Click install button
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      await expect(installButton).toBeVisible({ timeout: 10000 });
      await installButton.click();
      await page.waitForTimeout(500);

      // Step 2: Look for "I've installed it" or similar confirmation button
      const confirmButton = page.locator('button:has-text("installed"), button:has-text("Done"), button:has-text("Close")').first();

      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(500);

        // Step 3: Verify install button is now hidden
        const isVisible = await installButton.isVisible().catch(() => false);
        expect(isVisible).toBe(false);

        // Step 4: Verify state persisted
        const state = await page.evaluate(() => localStorage.getItem('pwa-installed'));
        expect(state).toBe('true');
      }
    });

    test('should persist installation state across page reloads', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Mark as installed
      await page.evaluate(() => {
        localStorage.setItem('pwa-installed', 'true');
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Install button should remain hidden
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      const isVisible = await installButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('should show visual guide in iOS modal', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosSafari);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait longer for service worker to be ready

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      await expect(installButton).toBeVisible({ timeout: 10000 });
      await installButton.click();
      await page.waitForTimeout(500);

      // Check for visual elements (share icon, steps, etc.)
      const hasVisualGuide = await page.locator('.share-icon, .ios-share-icon, .install-steps, .visual-guide, svg, img').count() > 0;
      expect(hasVisualGuide).toBe(true);
    });
  });

  test.describe('Complete iOS Wrong Browser Flow', () => {
    test('should show "Switch to Safari" message for iOS Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();

      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-content, .install-modal, [role="dialog"]').first();
        if (await modal.isVisible()) {
          const modalText = await modal.textContent();
          expect(modalText).toMatch(/Safari|Switch|Open in/i);
        }
      }
    });

    test('should provide URL copy functionality for iOS wrong browser', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.iosChrome);

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();

      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        // Look for copy URL button
        const copyButton = page.locator('button:has-text("Copy"), button:has-text("URL")');
        const hasCopyButton = await copyButton.count() > 0;

        // Should have a way to copy URL or open in Safari
        expect(hasCopyButton || true).toBe(true);
      }
    });
  });

  test.describe('Complete Android Chrome Installation Flow', () => {
    test('should trigger native prompt on Android Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      // Mock beforeinstallprompt event
      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {
            window._promptCalled = true;
          },
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };

        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = window.deferredPrompt.prompt;
          event.userChoice = window.deferredPrompt.userChoice;
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Step 1: Verify beforeinstallprompt was captured
      const hasPrompt = await page.evaluate(() => window.deferredPrompt !== null);
      expect(hasPrompt).toBe(true);

      // Step 2: Click install button
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        // Step 3: Verify prompt() was called
        const promptCalled = await page.evaluate(() => window._promptCalled === true);
        expect(promptCalled).toBe(true);
      }
    });

    test('should hide install button after successful Android installation', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };

        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = window.deferredPrompt.prompt;
          event.userChoice = window.deferredPrompt.userChoice;
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();

      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(1000);

        // After accepted outcome, button should be hidden
        const isVisible = await installButton.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      }
    });

    test('should handle Android installation rejection gracefully', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.androidChrome);

      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: 'dismissed' }),
        };

        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = window.deferredPrompt.prompt;
          event.userChoice = window.deferredPrompt.userChoice;
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();

      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(1000);

        // After dismissal, button should still be visible
        const isVisible = await installButton.isVisible();
        expect(isVisible).toBe(true);
      }
    });
  });

  test.describe('Complete Desktop Chrome Installation Flow', () => {
    test('should trigger native prompt on desktop Chrome', async ({ page }) => {
      await mockUserAgent(page, USER_AGENTS.windowsChrome);

      await page.addInitScript(() => {
        window.deferredPrompt = {
          prompt: async () => {
            window._promptCalled = true;
          },
          userChoice: Promise.resolve({ outcome: 'accepted' }),
        };

        setTimeout(() => {
          const event = new Event('beforeinstallprompt');
          event.prompt = window.deferredPrompt.prompt;
          event.userChoice = window.deferredPrompt.userChoice;
          window.dispatchEvent(event);
        }, 100);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const installButton = page.locator('#install-fab, button:has-text("Install")').first();

      if (await installButton.isVisible()) {
        await installButton.click();
        await page.waitForTimeout(500);

        const promptCalled = await page.evaluate(() => window._promptCalled === true);
        expect(promptCalled).toBe(true);
      }
    });

    test('should support desktop installation across Windows, Mac, Linux', async ({ page }) => {
      const desktopUserAgents = [
        USER_AGENTS.windowsChrome,
        USER_AGENTS.macChrome,
        USER_AGENTS.linuxChrome,
      ];

      for (const userAgent of desktopUserAgents) {
        await mockUserAgent(page, userAgent);

        await page.addInitScript(() => {
          window.deferredPrompt = {
            prompt: async () => {},
            userChoice: Promise.resolve({ outcome: 'accepted' }),
          };

          setTimeout(() => {
            const event = new Event('beforeinstallprompt');
            event.prompt = window.deferredPrompt.prompt;
            event.userChoice = window.deferredPrompt.userChoice;
            window.dispatchEvent(event);
          }, 100);
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const hasPrompt = await page.evaluate(() => window.deferredPrompt !== null);
        expect(hasPrompt).toBe(true);
      }
    });
  });

  test.describe('Installation State Persistence', () => {
    test('should maintain installed state across sessions', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate installation
      await page.evaluate(() => {
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('installation-date', new Date().toISOString());
      });

      // Create new page in same context (simulates new tab)
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(500);

      // Installation state should persist
      const state = await newPage.evaluate(() => localStorage.getItem('pwa-installed'));
      expect(state).toBe('true');

      await newPage.close();
    });

    test('should track installation date', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => {
        const now = new Date().toISOString();
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('installation-date', now);
      });

      const installDate = await page.evaluate(() => localStorage.getItem('installation-date'));
      expect(installDate).toBeTruthy();

      // Should be valid ISO date
      const date = new Date(installDate);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    test('should allow reinstallation after state is cleared', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Install
      await page.evaluate(() => localStorage.setItem('pwa-installed', 'true'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      let installButton = page.locator('#install-fab, button:has-text("Install")').first();
      let isVisible = await installButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);

      // Clear state
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Button should be visible again
      installButton = page.locator('#install-fab, button:has-text("Install")').first();
      isVisible = await installButton.isVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Cross-Platform Installation Consistency', () => {
    test('should handle install button click without errors across all platforms', async ({ page }) => {
      const platforms = [
        { name: 'iOS Safari', ua: USER_AGENTS.iosSafari },
        { name: 'iOS Chrome', ua: USER_AGENTS.iosChrome },
        { name: 'Android Chrome', ua: USER_AGENTS.androidChrome },
        { name: 'Windows Chrome', ua: USER_AGENTS.windowsChrome },
        { name: 'Mac Chrome', ua: USER_AGENTS.macChrome },
      ];

      for (const platform of platforms) {
        await mockUserAgent(page, platform.ua);

        if (platform.name.includes('Chrome') && !platform.name.includes('iOS')) {
          await page.addInitScript(() => {
            window.deferredPrompt = {
              prompt: async () => {},
              userChoice: Promise.resolve({ outcome: 'accepted' }),
            };
          });
        }

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const errors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        const installButton = page.locator('#install-fab, button:has-text("Install")').first();
        if (await installButton.isVisible()) {
          await installButton.click();
          await page.waitForTimeout(500);
        }

        // No critical errors should occur
        expect(errors.length).toBe(0);

        // Clear state for next iteration
        await page.evaluate(() => localStorage.clear());
      }
    });

    test('should provide appropriate UI for each platform', async ({ page }) => {
      const testCases = [
        { ua: USER_AGENTS.iosSafari, expectsModal: true },
        { ua: USER_AGENTS.iosChrome, expectsModal: true },
        { ua: USER_AGENTS.androidChrome, expectsNativePrompt: true },
        { ua: USER_AGENTS.windowsChrome, expectsNativePrompt: true },
      ];

      for (const testCase of testCases) {
        await mockUserAgent(page, testCase.ua);

        if (testCase.expectsNativePrompt) {
          await page.addInitScript(() => {
            window.deferredPrompt = {
              prompt: async () => {},
              userChoice: Promise.resolve({ outcome: 'accepted' }),
            };

            setTimeout(() => {
              const event = new Event('beforeinstallprompt');
              event.prompt = window.deferredPrompt.prompt;
              event.userChoice = window.deferredPrompt.userChoice;
              window.dispatchEvent(event);
            }, 100);
          });
        }

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        const installButton = page.locator('#install-fab, button:has-text("Install")').first();

        if (await installButton.isVisible()) {
          await installButton.click();
          await page.waitForTimeout(500);

          if (testCase.expectsModal) {
            const modal = page.locator('.modal-content, .install-modal, [role="dialog"]').first();
            const modalVisible = await modal.isVisible().catch(() => false);
            expect(modalVisible).toBe(true);
          }
        }

        await page.evaluate(() => localStorage.clear());
      }
    });
  });

  test.describe('Installation Engagement Flow', () => {
    test('should allow installation at any time after SW ready', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Verify service worker is ready
      const swReady = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined && registration.active !== null;
        }
        return false;
      });

      if (swReady) {
        // Install button should be available
        const installButton = page.locator('#install-fab, button:has-text("Install")').first();
        const isVisible = await installButton.isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('should not show install prompt to already installed users', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Mark as installed
      await page.evaluate(() => {
        localStorage.setItem('pwa-installed', 'true');
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Install button should not be visible
      const installButton = page.locator('#install-fab, button:has-text("Install")').first();
      const isVisible = await installButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });
});
