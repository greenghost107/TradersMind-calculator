import { test, expect } from '@playwright/test';

// Test 1: Menu button is visible in header
test('3-dot menu button is visible in header', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');
  await expect(menuBtn).toBeVisible();
});

// Test 2: Dropdown opens on click
test('dropdown opens when clicking 3-dot menu', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');
  const dropdown = page.locator('#settings-dropdown');

  await expect(dropdown).toBeHidden();
  await menuBtn.click();
  await expect(dropdown).toBeVisible();
});

// Test 3: Closes on outside click
test('dropdown closes when clicking outside', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');
  const dropdown = page.locator('#settings-dropdown');

  await menuBtn.click();
  await expect(dropdown).toBeVisible();
  await page.locator('body').click({ position: { x: 10, y: 10 } });
  await expect(dropdown).toBeHidden();
});

// Test 4: Closes on Escape
test('dropdown closes on Escape key', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');
  const dropdown = page.locator('#settings-dropdown');

  await menuBtn.click();
  await expect(dropdown).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dropdown).toBeHidden();
});

// Test 5: Contains "Add to Home Screen"
test('Add to Home Screen option is in menu', async ({ page }) => {
  await page.goto('/');
  await page.locator('#settings-menu-btn').click();
  const installBtn = page.locator('#menu-install-btn');
  await expect(installBtn).toBeVisible();
  await expect(installBtn).toContainText('Add to Home Screen');
});

// Test 6: ARIA attributes correct
test('menu has correct ARIA attributes', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');

  await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  await menuBtn.click();
  await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
});

// Test 7: Toggle works
test('clicking menu button toggles dropdown', async ({ page }) => {
  await page.goto('/');
  const menuBtn = page.locator('#settings-menu-btn');
  const dropdown = page.locator('#settings-dropdown');

  await menuBtn.click();
  await expect(dropdown).toBeVisible();
  await menuBtn.click();
  await expect(dropdown).toBeHidden();
});

// Test 8: Mobile viewport (375x667)
test('menu works on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  const menuBtn = page.locator('#settings-menu-btn');
  const dropdown = page.locator('#settings-dropdown');

  await menuBtn.click();
  await expect(dropdown).toBeVisible();

  // Check dropdown is within viewport
  const box = await dropdown.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});
