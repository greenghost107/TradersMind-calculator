import { test, expect } from '@playwright/test';

const BASE_INPUTS = {
  accountSize: '10000',
  entryPrice: '100',
  stopLoss: '95',  // R = $5 for a long
  maxPositions: '10'
};

async function fillBaseInputs(page) {
  await page.fill('#account-size', BASE_INPUTS.accountSize);
  await page.fill('#entry-price', BASE_INPUTS.entryPrice);
  await page.fill('#stop-loss', BASE_INPUTS.stopLoss);
  await page.fill('#max-positions', BASE_INPUTS.maxPositions);
  await page.waitForTimeout(400); // debounce
}

// Test 1: Deal button is visible in header
test('executed deal button is visible in header', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await expect(dealBtn).toBeVisible();
  await expect(dealBtn).toContainText('Deal');
});

// Test 2: Deal section is hidden by default
test('executed deal section is hidden by default', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealSection = page.locator('#executed-deal-section');
  await expect(dealSection).toBeHidden();
});

// Test 3: Clicking button toggles the deal section
test('clicking deal button shows the executed deal section', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  const dealSection = page.locator('#executed-deal-section');

  await dealBtn.click();
  await expect(dealSection).toBeVisible();
});

// Test 4: Clicking button again hides the section
test('clicking deal button again hides the section', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  const dealSection = page.locator('#executed-deal-section');

  await dealBtn.click();
  await expect(dealSection).toBeVisible();
  await dealBtn.click();
  await expect(dealSection).toBeHidden();
});

// Test 5: Button has active class when deal section is open
test('deal button has active class when panel is open', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');

  await expect(dealBtn).not.toHaveClass(/active/);
  await dealBtn.click();
  await expect(dealBtn).toHaveClass(/active/);
});

// Test 6: Deal section contains commission input with default 0.35
test('commission input has default value of 0.35', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  const commissionInput = page.locator('#deal-commission');
  await expect(commissionInput).toBeVisible();
  await expect(commissionInput).toHaveValue('0.35');
});

// Test 7: R value and targets display after valid inputs
test('deal section shows R value and targets when inputs are valid', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  // R = |100 - 95| = $5.00
  const rValue = page.locator('#deal-r-value');
  await expect(rValue).toContainText('$5.00');
});

// Test 8: 2R target price is correct for long position
test('2R target price is entry + 2*R for long position', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  // 2R target = 100 + 2*5 = $110.00
  const target2r = page.locator('#deal-target-2r');
  await expect(target2r).toContainText('$110.00');
});

// Test 9: 3R target price is correct for long position
test('3R target price is entry + 3*R for long position', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  // 3R target = 100 + 3*5 = $115.00
  const target3r = page.locator('#deal-target-3r');
  await expect(target3r).toContainText('$115.00');
});

// Test 10: 5R target price is correct for long position
test('5R target price is entry + 5*R for long position', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  // 5R target = 100 + 5*5 = $125.00
  const target5r = page.locator('#deal-target-5r');
  await expect(target5r).toContainText('$125.00');
});

// Test 11: % gain values are correct for long
test('% gain values are correct for long position', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  // 2R: 10/100 = 10.00%, 3R: 15/100 = 15.00%, 5R: 25/100 = 25.00%
  await expect(page.locator('#deal-percent-2r')).toContainText('10.00%');
  await expect(page.locator('#deal-percent-3r')).toContainText('15.00%');
  await expect(page.locator('#deal-percent-5r')).toContainText('25.00%');
});

// Test 12: Short position — target prices go below entry
test('target prices go below entry for short position', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  // For short: entry=100, stop=105 (stop above entry), R=5
  await page.fill('#account-size', '10000');
  await page.fill('#entry-price', '100');
  await page.locator('#short-btn').click();
  await page.fill('#stop-loss', '105');
  await page.waitForTimeout(400);

  // 2R target = 100 - 2*5 = $90.00
  await expect(page.locator('#deal-target-2r')).toContainText('$90.00');
  await expect(page.locator('#deal-target-3r')).toContainText('$85.00');
  await expect(page.locator('#deal-target-5r')).toContainText('$75.00');
});

// Test 13: Copy button is visible next to R info
test('copy button is visible in deal section', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  const copyBtn = page.locator('#deal-copy-btn');
  await expect(copyBtn).toBeVisible();
});

// Test 14: Copy button gets "copied" class on click
test('copy button shows copied feedback on click', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  await fillBaseInputs(page);

  const copyBtn = page.locator('#deal-copy-btn');
  await copyBtn.click();
  await expect(copyBtn).toHaveClass(/copied/);
});

// Test 15: Results show dash when inputs are cleared
test('deal results show dash when inputs are invalid', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const dealBtn = page.locator('#executed-deal-btn');
  await dealBtn.click();

  // Clear entry price to invalidate
  await page.fill('#account-size', '10000');
  await page.fill('#entry-price', '');
  await page.fill('#stop-loss', '95');
  await page.waitForTimeout(400);

  await expect(page.locator('#deal-r-value')).toContainText('-');
  await expect(page.locator('#deal-target-2r')).toContainText('-');
});
