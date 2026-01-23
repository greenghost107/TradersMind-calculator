/**
 * Android Install Flow - Realistic Timing Tests
 *
 * These tests simulate real-world Android Chrome behavior where beforeinstallprompt
 * fires 2-5+ seconds after page load, not immediately.
 *
 * Purpose: Verify that the install flow handles realistic timing delays correctly,
 * rather than the immediate event firing used in other tests.
 */

const { test, expect } = require('@playwright/test');

test.describe('Android Install Flow - Realistic Timing', () => {
    // Configure as Android device
    test.use({
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
    });

    test.beforeEach(async ({ page }) => {
        // Mock service worker as ready (consistent with other tests)
        await page.addInitScript(() => {
            window.__TEST_MODE__ = true;
            window.__TEST_HTTPS__ = true;

            // Mock service worker
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
        });
    });

    test('should show native prompt when beforeinstallprompt fires after 2.5 seconds', async ({ page }) => {
        await page.addInitScript(() => {
            // Simulate DELAYED beforeinstallprompt (real Android timing)
            setTimeout(() => {
                const event = new Event('beforeinstallprompt');
                event.preventDefault = () => {};
                event.prompt = async () => {
                    window.__promptCalled = true;
                    return Promise.resolve();
                };
                event.userChoice = Promise.resolve({ outcome: 'accepted' });
                window.dispatchEvent(event);
            }, 2500); // 2.5 second delay - realistic Android timing
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click install button BEFORE beforeinstallprompt fires
        await page.locator('#install-btn').click();

        // Wait for the delayed prompt to arrive
        await page.waitForTimeout(3000);

        // Should have called the native prompt
        const promptCalled = await page.evaluate(() => window.__promptCalled === true);
        expect(promptCalled).toBe(true);
    });

    test('should show loading state while waiting for prompt', async ({ page }) => {
        await page.addInitScript(() => {
            // Never fire beforeinstallprompt - simulate scenario where event takes too long
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.locator('#install-btn').click();

        const instructions = page.locator('#pwa-instructions');
        // Should show loading indicator, not manual instructions immediately
        await expect(instructions).toContainText(/waiting|loading|checking/i, { timeout: 1000 });

        // After timeout, should transition to manual instructions
        await page.waitForTimeout(5500);
        await expect(instructions).toContainText('Tap the menu button');
    });

    test('should switch from loading to native prompt when event fires mid-wait', async ({ page }) => {
        await page.addInitScript(() => {
            window.__firePromptAfter = (ms) => {
                setTimeout(() => {
                    const event = new Event('beforeinstallprompt');
                    event.preventDefault = () => {};
                    event.prompt = async () => {
                        window.__promptCalled = true;
                        return Promise.resolve();
                    };
                    event.userChoice = Promise.resolve({ outcome: 'accepted' });
                    window.dispatchEvent(event);
                }, ms);
            };
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Click install - starts waiting
        await page.locator('#install-btn').click();

        // Modal should show loading state
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText(/waiting|loading|checking/i, { timeout: 1000 });

        // Fire prompt after 3 seconds (within extended timeout)
        await page.evaluate(() => window.__firePromptAfter(3000));

        // Wait for prompt to arrive and be triggered
        await page.waitForTimeout(3500);

        // Should have transitioned to native prompt flow
        const promptCalled = await page.evaluate(() => window.__promptCalled === true);
        expect(promptCalled).toBe(true);
    });

    test('should show manual instructions after 5 second timeout', async ({ page }) => {
        await page.addInitScript(() => {
            // Never fire beforeinstallprompt
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const startTime = Date.now();
        await page.locator('#install-btn').click();

        const instructions = page.locator('#pwa-instructions');

        // Wait for manual instructions to appear
        await expect(instructions).toContainText('Tap the menu button', { timeout: 6000 });

        const elapsed = Date.now() - startTime;
        // Should have waited at least 4.5 seconds (allowing for test variance)
        expect(elapsed).toBeGreaterThan(4500);
    });

    test('should handle rapid clicks while waiting for prompt', async ({ page }) => {
        await page.addInitScript(() => {
            window.__clickCount = 0;

            setTimeout(() => {
                const event = new Event('beforeinstallprompt');
                event.preventDefault = () => {};
                event.prompt = async () => {
                    window.__clickCount++;
                    return Promise.resolve();
                };
                event.userChoice = Promise.resolve({ outcome: 'accepted' });
                window.dispatchEvent(event);
            }, 3000);
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Rapid clicks
        const installBtn = page.locator('#install-btn');
        await installBtn.click();
        await page.waitForTimeout(200);

        // Try to click again (modal should be open)
        const modal = page.locator('#pwa-install-modal');
        await expect(modal).not.toHaveClass(/hidden/);

        await page.waitForTimeout(3500);

        // Should only trigger prompt once
        const clickCount = await page.evaluate(() => window.__clickCount);
        expect(clickCount).toBeLessThanOrEqual(1);
    });

    test('should show loading spinner element', async ({ page }) => {
        await page.addInitScript(() => {
            // Never fire beforeinstallprompt
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await page.locator('#install-btn').click();

        // Check that waiting state content is shown
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText('Checking Installation', { timeout: 1000 });

        // Verify loading spinner exists in DOM
        const spinnerCount = await page.locator('.loading-spinner').count();
        expect(spinnerCount).toBeGreaterThan(0);

        // Check for waiting message text
        await expect(instructions).toContainText('Please wait while we check');
    });

    test('should use early-captured prompt when available', async ({ page }) => {
        // Simulate early capture by firing the event right after page starts loading
        // This mimics what happens on GitHub Pages when the event fires before scripts load
        await page.addInitScript(() => {
            // Wait for the inline script to set up its listener, then fire the event
            setTimeout(() => {
                const event = new Event('beforeinstallprompt');
                event.preventDefault = () => {};
                event.prompt = async () => {
                    window.__promptCalled = true;
                    return Promise.resolve();
                };
                event.userChoice = Promise.resolve({ outcome: 'accepted' });

                // Fire the event - the inline script in <head> will capture it
                window.dispatchEvent(event);
                console.log('[Test] Fired early beforeinstallprompt event');
            }, 10); // Fire very early, before external scripts load
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait a bit for PWAInstallManager to initialize and pick up the early-captured prompt
        await page.waitForTimeout(1000);

        // Check that the manager picked up the early-captured prompt
        const hasPrompt = await page.evaluate(() => {
            return window.pwaInstaller?.manager?.getState().hasDeferredPrompt === true;
        });
        expect(hasPrompt).toBe(true);

        // Click install - should use early-captured prompt immediately
        await page.locator('#install-btn').click();

        // Should trigger native prompt immediately (no loading state, or very brief)
        await page.waitForTimeout(500);

        const promptCalled = await page.evaluate(() => window.__promptCalled === true);
        expect(promptCalled).toBe(true);
    });
});
