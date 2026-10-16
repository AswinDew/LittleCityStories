import { test, expect } from '@playwright/test';

test('production renders without exposing test controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  await page.goto('/?manual=1');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Civilization Town' })).toBeVisible();
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__)).toBeUndefined();
  await page.getByTitle('Zoom In (+)', { exact: true }).click();
  expect(errors).toEqual([]);
});
