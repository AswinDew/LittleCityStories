import { test, expect } from '@playwright/test';

test('production renders without exposing test controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  const textures = ['grass', 'dirt', 'path'].map(kind => page.waitForResponse(response =>
    response.url().endsWith(`/generated/terrain/${kind}.png`) && response.status() === 200));
  const citizens = page.waitForResponse(response => response.url().endsWith('/generated/characters/citizens.png') && response.status() === 200);
  await page.goto('/?manual=1&assets=1');
  await Promise.all(textures);
  await citizens;
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Civilization Town' })).toBeVisible();
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__)).toBeUndefined();
  await expect(page.locator('[data-gallery-ready]')).toHaveCount(0);
  await page.getByTitle('Zoom In (+)', { exact: true }).click();
  expect(errors).toEqual([]);
});
