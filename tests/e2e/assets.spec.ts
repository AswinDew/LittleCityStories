import { test, expect } from '@playwright/test';

test('all generated assets load and ancient models/sprites render in the inspection gallery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto('/?assets=1&manual=1');
  await expect(page.locator('[data-gallery-ready]')).toBeVisible();
  await expect(page.locator('[data-asset-label]')).toHaveCount(8);
  await expect(page.locator('[data-icon]')).toHaveCount(19);
  await expect.poll(() => page.locator('img[data-icon]').evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 24))).toBe(true);
  const state = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  expect(state.citizens).toEqual({});
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getLegacyState().placedBuildings)).toEqual({});
  const before = await page.locator('[data-gallery-ready]').getAttribute('data-frame');
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(2));
  await expect.poll(() => page.locator('[data-gallery-ready]').getAttribute('data-frame')).not.toBe(before);
  await page.getByRole('button', { name: 'Work poses' }).click();
  await expect(page.locator('[data-gallery-ready]')).toHaveAttribute('data-activity', 'work');
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(6));
  await page.screenshot({ path: 'test-results/m2-asset-gallery.png' });
  expect(errors).toEqual([]);
});
