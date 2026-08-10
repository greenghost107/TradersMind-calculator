import { test, expect } from '@playwright/test';

async function fillInputs(page, { accountSize, maxPositions, entryPrice, stopLoss, riskPercent }) {
  if (accountSize !== undefined) await page.fill('#account-size', String(accountSize));
  if (maxPositions !== undefined) await page.fill('#max-positions', String(maxPositions));
  if (entryPrice !== undefined) await page.fill('#entry-price', String(entryPrice));
  if (stopLoss !== undefined) await page.fill('#stop-loss', String(stopLoss));
  if (riskPercent !== undefined) {
    await page.evaluate((val) => {
      const slider = document.getElementById('risk-percent');
      slider.value = val;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(riskPercent));
  }
  await page.waitForTimeout(400); // debounce
}

// User's exact scenario: account 18000, positions 8, entry 89.92, stop 87.58, risk 0.3%
// Suggested = floor((18000*0.003 / 0.02602) / 89.92) = 23 shares.
const EXAMPLE = { accountSize: '18000', maxPositions: '8', entryPrice: '89.92', stopLoss: '87.58', riskPercent: '0.3' };

async function setOverride(page, value) {
  // Open the editor if it isn't already open
  const row = page.locator('#shares-override-row');
  if (!(await row.isVisible())) {
    await page.click('#edit-shares-btn');
  }
  await page.fill('#shares-override-input', String(value));
  await page.locator('#shares-override-input').dispatchEvent('input');
  await page.waitForTimeout(400); // debounce
}

test('override recomputes shares, position value and percentage', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);

  const riskShares = page.locator('#risk-shares-to-buy');
  await expect(riskShares).toHaveText('23');

  await page.click('#edit-shares-btn');
  await expect(page.locator('#shares-override-row')).toBeVisible();
  // Prefilled with the current suggested value
  await expect(page.locator('#shares-override-input')).toHaveValue('23');

  await setOverride(page, 22);

  await expect(riskShares).toHaveText('22');
  await expect(page.locator('#risk-total-position-value')).toHaveText('$1,978.24');
  await expect(page.locator('#risk-position-percentage')).toHaveText('10.99%');

  const suggested = page.locator('#risk-suggested-label');
  await expect(suggested).toBeVisible();
  await expect(suggested).toContainText('23');
});

test('actual portfolio risk follows the chosen share count', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);

  // At the suggested 23 shares: actual risk = (89.92-87.58)*23 = $53.82; 53.82/18000 = 0.30%
  await expect(page.locator('#portfolio-risk-amount')).toHaveText('$53.82');
  await expect(page.locator('#portfolio-risk-percent')).toHaveText('0.30%');

  await setOverride(page, 22);

  // At 22 shares: actual risk = 2.34*22 = $51.48; 51.48/18000 = 0.286% -> 0.29%
  await expect(page.locator('#portfolio-risk-amount')).toHaveText('$51.48');
  await expect(page.locator('#portfolio-risk-percent')).toHaveText('0.29%');
});

test('override accepts fractional shares', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);
  await setOverride(page, 22.5);

  await expect(page.locator('#risk-shares-to-buy')).toHaveText('22.5');
  // 22.5 * 89.92 = 2023.20
  await expect(page.locator('#risk-total-position-value')).toHaveText('$2,023.20');
});

test('reset returns to the suggested value', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);
  await setOverride(page, 22);
  await expect(page.locator('#risk-shares-to-buy')).toHaveText('22');

  await page.click('#shares-override-reset');
  await page.waitForTimeout(400);

  await expect(page.locator('#risk-shares-to-buy')).toHaveText('23');
  await expect(page.locator('#risk-suggested-label')).toBeHidden();
});

test('header Reset button appears only while overridden and resets shares', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);

  // Hidden until an override is active
  await expect(page.locator('#reset-shares-btn')).toBeHidden();

  await setOverride(page, 22);
  await expect(page.locator('#reset-shares-btn')).toBeVisible();
  await expect(page.locator('#risk-shares-to-buy')).toHaveText('22');

  await page.click('#reset-shares-btn');
  await page.waitForTimeout(400);

  await expect(page.locator('#risk-shares-to-buy')).toHaveText('23');
  await expect(page.locator('#reset-shares-btn')).toBeHidden();
});

test('override resets when entry price changes', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, EXAMPLE);
  await setOverride(page, 22);
  await expect(page.locator('#risk-shares-to-buy')).toHaveText('22');

  // Changing entry redefines risk-per-share -> override clears, back to recomputed suggestion
  await fillInputs(page, { entryPrice: '90.00' });

  await expect(page.locator('#risk-suggested-label')).toBeHidden();
  await expect(page.locator('#shares-override-row')).toBeHidden();
  // Recomputed suggestion at entry 90.00: stop% = (90-87.58)/90 = 2.6889%;
  // value = 54/0.026889 = 2008.3; shares = floor(2008.3/90) = 22
  await expect(page.locator('#risk-shares-to-buy')).toHaveText('22');
});
