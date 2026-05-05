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

// Exact scenario from the plan: 16000 / 8 / 59.22 / 57.76 / 1.5% → expect 164 shares with warning
test('tight stop scenario shows risk-based shares (164) exceeding 1/N slot', async ({ page }) => {
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
  await expect(riskShares).toHaveText('164');

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toBeVisible();
  await expect(constraintLabel).toContainText('1/8');
  await expect(constraintLabel).toContainText('33');
});

// Warning label shows the correct 1/N slot share count
test('warning message cites the correct 1/N slot share count', async ({ page }) => {
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

  const constraintLabel = page.locator('#risk-constraint-label');
  await expect(constraintLabel).toContainText('Exceeds 1/8 diversification slot (33 shares)');
});

// Wide stop: risk-based shares are below position cap, no warning shown
test('wide stop shows no diversification warning', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // entry=100, stop=95 → stop%=5%, N=10, risk=1%
  // riskBasedShares = floor((10000*0.01/0.05)/100) = floor(2000/100) = 20
  // positionLimit   = floor((10000/10)/100) = floor(100) = 10
  // With new logic: finalShares = min(20, 9500) = 20 → exceeds 10 → warning shows
  // Actually 20 > 10 so there IS a warning. Let me use lower risk to avoid that.
  // risk=0.5%: riskBased = floor((10000*0.005/0.05)/100) = floor(1000/100) = 10 = positionLimit → no warning
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

// Risk slider is responsive: increasing risk increases shares when stop is tight
test('increasing risk percent increases share count for tight stop', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await fillInputs(page, {
    accountSize: '16000',
    maxPositions: '8',
    entryPrice: '59.22',
    stopLoss: '57.76',
    riskPercent: '0.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  const sharesAt05 = await riskShares.textContent();

  await fillInputs(page, {
    riskPercent: '1.5'
  });

  const sharesAt15 = await riskShares.textContent();

  const low = parseInt(sharesAt05.replace(/,/g, ''), 10);
  const high = parseInt(sharesAt15.replace(/,/g, ''), 10);
  expect(high).toBeGreaterThan(low);
});

// Capital ceiling: extreme tight stop should not let shares exceed 95% of capital
test('shares never exceed 95% capital ceiling', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Extremely tight stop: entry=100, stop=99.99 → stop%=0.01%
  // riskBased at 1.5% would be enormous; capital ceiling at 95% of 10000 = 9500 shares max
  await fillInputs(page, {
    accountSize: '10000',
    maxPositions: '10',
    entryPrice: '1',      // cheap stock so ceiling is reachable: 9500 shares max
    stopLoss: '0.99',
    riskPercent: '1.5'
  });

  const riskShares = page.locator('#risk-shares-to-buy');
  const sharesText = await riskShares.textContent();
  const shares = parseInt(sharesText.replace(/,/g, ''), 10);

  // 0.95 * 10000 / 1 = 9500 max
  expect(shares).toBeLessThanOrEqual(9500);
});

// Formula reference card shows the 1/N slot for transparency
test('formula result shows 1/N slot reference when exceeding it', async ({ page }) => {
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

  const formulaResult = page.locator('#formula-result');
  await expect(formulaResult).toContainText('exceeds 1/8 slot');
  await expect(formulaResult).toContainText('33 shares');
});
