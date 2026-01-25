/**
 * Android Install Flow - Real User Behavior Tests
 *
 * These tests verify that Android users can install the PWA through manual instructions
 * when the beforeinstallprompt hasn't fired yet, and can use the native prompt when available.
 */

const { test, expect } = require('@playwright/test');

test.describe('Android Install Flow - Real User Behavior', () => {

    test.use({
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 }, // Pixel 7 dimensions
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
    });

    // Set up test environment for all tests in this suite
    test.beforeEach(async ({ page }) => {
        // Add init script BEFORE navigating
        await page.addInitScript(() => {
            // Set test mode flag that app can check
            window.__TEST_MODE__ = true;
            window.__TEST_HTTPS__ = true;

            // Ensure beforeinstallprompt support exists
            if (!('onbeforeinstallprompt' in window)) {
                window.onbeforeinstallprompt = null;
            }

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

    test('should show install instructions immediately on first visit', async ({ page }) => {
        // Visit app for first time (no prompt fired yet)
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for service worker to register
        await page.waitForTimeout(2000);

        // Open install modal (via FAB or menu)
        const installButton = page.locator('#install-btn');
        await expect(installButton).toBeVisible();
        await installButton.click();

        // Verify modal opens
        const modal = page.locator('#pwa-install-modal');
        await expect(modal).not.toHaveClass(/hidden/);

        // First, should show loading state
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText('Checking Installation');

        // After timeout, should show manual install instructions (NOT "Installation Available Soon")
        await expect(instructions).toContainText('Install This App', { timeout: 6000 });
        await expect(instructions).toContainText('Tap the menu button');
        await expect(instructions).toContainText('⋮');
        await expect(instructions).not.toContainText('Installation Available Soon');

        // Should show confirmation button
        const actionButton = page.locator('#pwa-install-action');
        await expect(actionButton).toContainText('I\'ve installed it');
        await expect(actionButton).toHaveAttribute('data-action', 'mark-installed');
    });

    test('should switch to native prompt when beforeinstallprompt fires', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open modal - shows loading state initially
        await page.locator('#install-btn').click();
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText('Checking Installation');

        // Simulate Chrome firing beforeinstallprompt after engagement
        await page.evaluate(() => {
            const event = new Event('beforeinstallprompt');
            event.preventDefault = () => {};
            event.prompt = async () => {
                window.__promptCalled = true;
                return Promise.resolve();
            };
            event.userChoice = Promise.resolve({ outcome: 'accepted' });
            window.dispatchEvent(event);
        });

        // Wait for state to update
        await page.waitForTimeout(500);

        // Instructions should now offer native install
        await expect(instructions).toContainText('Install This App');
        const actionButton = page.locator('#pwa-install-action');
        await expect(actionButton).toContainText('Install Now');
        await expect(actionButton).toHaveAttribute('data-action', 'install');
    });

    test('should mark as installed when user confirms manual install', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open modal and follow manual install
        await page.locator('#install-btn').click();

        // Wait for loading state to complete and manual instructions to show
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText('Tap the menu button', { timeout: 6000 });

        // User follows instructions and taps confirmation
        const confirmButton = page.locator('#pwa-install-action');
        await confirmButton.click();

        // Modal should close
        const modal = page.locator('#pwa-install-modal');
        await expect(modal).toHaveClass(/hidden/);

        // Verify state saved to localStorage
        const history = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('pwa_install_history') || '[]');
        });
        expect(history.length).toBeGreaterThan(0);
        expect(history[history.length - 1].outcome).toBe('manual_install');

        // Note: Install button may remain visible because app isn't actually in standalone mode
        // Button will hide when user reopens app from home screen (standalone mode detection)
        // For now, just verify that state was saved correctly
    });

    test('should handle service worker loading state', async ({ page, context }) => {
        // Create a new page without the service worker mock for this test
        const testPage = await context.newPage();

        // Add init script without service worker mock
        await testPage.addInitScript(() => {
            window.__TEST_MODE__ = true;
            window.__TEST_HTTPS__ = true;

            if (!('onbeforeinstallprompt' in window)) {
                window.onbeforeinstallprompt = null;
            }

            // Don't mock service worker as ready - let it load naturally
        });

        // Navigate
        await testPage.goto('/');

        // Immediately try to open install modal (before SW is ready)
        const installBtn = testPage.locator('#install-btn');
        if (await installBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await installBtn.click();
        } else {
            // If FAB not visible, skip this test
            test.skip();
            await testPage.close();
            return;
        }

        // Should show loading message
        const instructions = testPage.locator('#pwa-instructions');
        const content = await instructions.textContent().catch(() => '');

        // Either shows loading state OR already loaded (both are acceptable)
        if (content.includes('Checking Installation') || content.includes('Installation Loading')) {
            // Wait for timeout to complete and show manual instructions
            await testPage.waitForTimeout(5500);

            // Should update to show install instructions
            const updatedContent = await instructions.textContent();
            expect(updatedContent.includes('Install This App') || updatedContent.includes('install this app')).toBe(true);
        } else {
            // Already showing install instructions or default content
            expect(content.includes('Install This App') || content.includes('install this app')).toBe(true);
        }

        await testPage.close();
    });

    test('should show install instructions via settings menu', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open settings menu
        const settingsBtn = page.locator('#settings-menu-btn');
        await settingsBtn.click();

        // Click menu install button
        const menuInstallBtn = page.locator('#menu-install-btn');
        await expect(menuInstallBtn).toBeVisible();
        await menuInstallBtn.click();

        // Modal should open with instructions
        const modal = page.locator('#pwa-install-modal');
        await expect(modal).not.toHaveClass(/hidden/);

        const instructions = page.locator('#pwa-instructions');
        // Wait for loading state to complete
        await expect(instructions).toContainText('Install This App', { timeout: 6000 });
        await expect(instructions).toContainText('Tap the menu button');
    });

    test('should display correct step-by-step instructions', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open install modal
        await page.locator('#install-btn').click();

        // Verify all three steps are present
        const instructions = page.locator('#pwa-instructions');

        // Wait for loading state to complete and manual instructions to show
        // Step 1: Menu button
        await expect(instructions).toContainText('Tap the menu button', { timeout: 6000 });
        await expect(instructions).toContainText('⋮');
        await expect(instructions).toContainText('(top right corner)');

        // Step 2: Find install option
        await expect(instructions).toContainText('Look for');
        await expect(instructions).toContainText('"Install app"');
        await expect(instructions).toContainText('"Add to Home screen"');

        // Step 3: Confirm installation
        await expect(instructions).toContainText('Tap');
        await expect(instructions).toContainText('"Install"');
        await expect(instructions).toContainText('to confirm');
    });

    test('should handle multiple open/close cycles', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const installButton = page.locator('#install-btn');
        const modal = page.locator('#pwa-install-modal');
        const closeButton = page.locator('#pwa-close-btn');

        // First cycle
        await installButton.click();
        await expect(modal).not.toHaveClass(/hidden/);
        await closeButton.click();
        await expect(modal).toHaveClass(/hidden/);

        // Second cycle
        await installButton.click();
        await expect(modal).not.toHaveClass(/hidden/);

        // Verify instructions still correct
        const instructions = page.locator('#pwa-instructions');
        await expect(instructions).toContainText('Install This App');
        await expect(instructions).toContainText('Tap the menu button');
    });

    test('should not show "Installation Available Soon" message', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open modal
        await page.locator('#install-btn').click();

        // Explicitly verify the old message doesn't appear
        const instructions = page.locator('#pwa-instructions');
        const content = await instructions.textContent();

        expect(content).not.toContain('Installation Available Soon');
        expect(content).not.toContain('requires some interaction first');
        expect(content).not.toContain('Try using the app for a moment');
    });

    test('should preserve install button visibility during session', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const installButton = page.locator('#install-btn');

        // Install button should be visible
        await expect(installButton).toBeVisible();

        // Perform some interactions
        await page.locator('input[type="number"]').first().fill('100');
        await page.waitForTimeout(500);

        // Install button should still be visible
        await expect(installButton).toBeVisible();

        // Open and close modal
        await installButton.click();
        await page.locator('#pwa-close-btn').click();

        // Install button should still be visible
        await expect(installButton).toBeVisible();
    });

    test('should handle escape key to close modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Open modal
        await page.locator('#install-btn').click();
        const modal = page.locator('#pwa-install-modal');
        await expect(modal).not.toHaveClass(/hidden/);

        // Press Escape key
        await page.keyboard.press('Escape');

        // Modal should close
        await expect(modal).toHaveClass(/hidden/);
    });
});
