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

// User's exact scenario at default 1% risk: position would be 109 shares = 40.34% of account.
// With 25% cap: 25% of $16,000 = $4,000 → floor(4000/59.22) = 67 shares = 24.80%
test('user scenario at 1% risk caps at 25% of account', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '16000',
    maxPositions: '8',
    entryPrice: '59.22',
    stopLoss: '57.76',
    riskPercent: '1.0'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  await expect(riskShares).toHaveText('67');

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toBeVisible();
  await expect(constraintLabel).toContainText('25%');

  // Verify position % of account is below 25
  const positionPercent = page.locator('#risk-position-percentage');
  const text = await positionPercent.textContent();
  const value = parseFloat(text.replace('%', ''));
  expect(value).toBeLessThanOrEqual(25);
});

// At max risk (1.5%) the same scenario stays capped at 25%
test('user scenario at 1.5% risk still capped at 25%', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '16000',
    maxPositions: '8',
    entryPrice: '59.22',
    stopLoss: '57.76',
    riskPercent: '1.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  await expect(riskShares).toHaveText('67');

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toContainText('Capped at 25%');
});

// 1/N slot warning shows when finalShares > 1/N slot but still under 25% cap
// 10000 / 10 / 100 / 97 / 0.5%:
//   stop% = 3%, riskBased = floor((10000*0.005/0.03)/100) = floor(16.67) = 16
//   25% cap = floor(2500/100) = 25 → not hit
//   1/N slot = floor(1000/100) = 10 → 16 > 10 → exceeds
test('shows 1/N slot warning when 25% cap is not hit', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '100',
    stopLoss: '97',
    riskPercent: '0.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  await expect(riskShares).toHaveText('16');

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toContainText('Exceeds 1/10 diversification slot (10 shares)');
});

// Wide stop with low risk: no warning shown
// 10000 / 10 / 100 / 95 / 0.5%:
//   stop% = 5%, riskBased = floor(1000/100) = 10
//   1/N slot = 10 → not strictly greater → no exceedance
test('wide stop with low risk shows no warning', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '100',
    stopLoss: '95',
    riskPercent: '0.5'
  });

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toBeHidden();
});

// Slider responsiveness: increasing risk % increases shares (until 25% cap is hit)
test('increasing risk percent increases shares when not yet capped', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Use a wider stop where 25% cap won't bind across the slider range
  // stop=92 → stop%=8%; at risk=0.5% riskBased=floor((10000*0.005/0.08)/100)=floor(6.25)=6
  // at risk=1.5% riskBased=floor((10000*0.015/0.08)/100)=floor(18.75)=18
  // 25% cap = 25, so neither hits the cap.
  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '100',
    stopLoss: '92',
    riskPercent: '0.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  const sharesAt05 = parseInt((await riskShares.textContent()).replace(/,/g, ''), 10);

  await fillInputs(page, { riskPercent: '1.5' });
  const sharesAt15 = parseInt((await riskShares.textContent()).replace(/,/g, ''), 10);

  expect(sharesAt15).toBeGreaterThan(sharesAt05);
});

// Hard 25% cap: position never exceeds 25% of account
test('shares never exceed 25% of account', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Extremely tight stop with maximum risk - riskBased would be huge
  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '1',
    stopLoss: '0.99',
    riskPercent: '1.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  const shares = parseInt((await riskShares.textContent()).replace(/,/g, ''), 10);

  // 25% of 10000 = 2500 max value, at $1/share → 2500 shares max
  expect(shares).toBeLessThanOrEqual(2500);

  const positionPercent = page.locator('#risk-position-percentage');
  const text = await positionPercent.textContent();
  const value = parseFloat(text.replace('%', ''));
  expect(value).toBeLessThanOrEqual(25);
});

// Formula result annotates the 25%-cap state when the cap binds
test('formula result shows 25% cap annotation when capped', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '16000',
    maxPositions: '8',
    entryPrice: '59.22',
    stopLoss: '57.76',
    riskPercent: '1.0'
  });

  const formulaResult = page.locator('#formula-result');
  await expect(formulaResult).toContainText('capped at 25% of account');
});

// Formula result shows 1/N slot reference when only the diversification slot is exceeded
test('formula result shows 1/N slot reference when only exceeding 1/N', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '100',
    stopLoss: '97',
    riskPercent: '0.5'
  });

  const formulaResult = page.locator('#formula-result');
  await expect(formulaResult).toContainText('exceeds 1/10 slot');
  await expect(formulaResult).toContainText('10 shares');
});
