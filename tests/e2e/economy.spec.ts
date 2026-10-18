import { test, expect } from '@playwright/test';

test('shows farm operating status and real meals/tax without assigning production workers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page.locator('[data-def-id=farm]').click();
  const tile = await page.evaluate(() => window.__CIV_TOWN_TEST__!.gridToScreen({ x: 12, z: 12 }));
  await page.mouse.click(tile.x, tile.y); await page.keyboard.press('Escape'); await page.mouse.click(tile.x, tile.y);
  await expect(page.locator('[data-operating-status=under_construction]')).toContainText('Menunggu konstruksi');
  const before = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(1200));
  const after = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  expect(after.resources).toEqual({ ...before.resources, food: 84, coins: 56 });
  expect(Object.keys(after.citizens)).toHaveLength(3);
  await expect(page.locator('[data-operating-status=no_workers]')).toContainText('Menunggu pekerja');
  expect(after.economy.consumptionTicks).toBe(0);
  await expect(page.locator('[data-resource=food] strong')).toHaveText('84');
  await expect(page.locator('[data-resource=coins] strong')).toHaveText('56');
  await page.screenshot({ path: 'test-results/m4-economy.png' });
  expect(errors).toEqual([]);
});
