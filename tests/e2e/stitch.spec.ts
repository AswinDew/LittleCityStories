import { test, expect } from '@playwright/test';

test('one-building review shows the original Stitch source and the real Town Center model', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?buildingReview=town_center');
  await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.locator('svg image')).toHaveAttribute('href', /ancient-sites-master\.jpg/);
  await expect(page.locator('.town-review canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/town-center-reference-review.png' });
  await page.getByRole('button', { name: 'Sudut game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sudut game', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/town-center-game-review.png' });
  await page.getByRole('button', { name: 'Putar 90°', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Stitch static assets and matte HUD load while real settlement controls remain usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  const manifest = await page.request.get('/generated/manifest.json');
  expect((await manifest.json()).artSource.provider).toBe('Stitch');
  const panel = page.locator('.settlement-title');
  await expect(panel).toHaveCSS('backdrop-filter', 'none');
  await expect(panel).toHaveCSS('border-radius', '4px');
  const state = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  await expect(page.locator('[data-resource=wood] strong')).toHaveText(String(state.resources.wood));
  await expect.poll(() => page.locator('.resource-bar img').evaluateAll(images => images.every(image =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 24))).toBe(true);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await expect(page.locator('[data-def-id=farm]')).toBeVisible();
  await expect(page.locator('[data-def-id=lumber_camp]')).toBeVisible();
  await page.screenshot({ path: 'test-results/stitch-settlement-static.png' });
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setCameraZoom(2.8));
  await page.screenshot({ path: 'test-results/stitch-settlement-close.png' });
  expect(errors).toEqual([]);
});

test('narrow HUD keeps resources, zoom and selected building controls separated', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  const point = await page.evaluate(() => {
    const hook = window.__CIV_TOWN_TEST__!;
    const building = Object.values(hook.getSnapshot().buildings)[0];
    return hook.gridToScreen({ x: building.gridX, z: building.gridZ });
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole('complementary', { name: 'Building inspector' })).toBeVisible();
  const resources = await page.locator('.resource-bar').boundingBox();
  const zoom = await page.locator('.camera-zoom').boundingBox();
  expect(zoom!.y).toBeGreaterThanOrEqual(resources!.y + resources!.height + 8);
  const inspector = await page.locator('.construction-inspector').boundingBox();
  const dock = await page.locator('.construction-dock').boundingBox();
  expect(inspector!.y).toBeGreaterThanOrEqual(zoom!.y + zoom!.height + 8);
  expect(inspector!.y + inspector!.height + 8).toBeLessThanOrEqual(dock!.y);
  await page.screenshot({ path: 'test-results/stitch-mobile.png' });
});
