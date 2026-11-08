import { test, expect } from '@playwright/test';

test('a direct-skin choice made during legacy loading survives initialization', async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/building-skins/town-center/atlas.png', async route => {
    await hold; await route.continue();
  });
  await page.goto('/?buildingReview=town_center', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Desain Stitch langsung', exact: true }).click();
  await expect(page.locator('[data-direct-status]')).toHaveAttribute('data-direct-status', 'ready');
  release(); await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desain Stitch langsung', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('direct Stitch skin is an isolated native-art 3D prototype with rotation and inspection tools', async ({ page }) => {
  const errors: string[] = []; let images = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().endsWith('/town-center-direct/design.png')) images++; });
  await page.goto('/?buildingReview=town_center&appearance=direct');
  await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.locator('[data-direct-status]')).toHaveAttribute('data-direct-status', 'ready');
  await expect(page.getByRole('button', { name: 'Desain Stitch langsung', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-direct-status]')).toContainText('360×366');
  expect(Number(await page.locator('[data-model-draw-calls]').getAttribute('data-model-draw-calls'))).toBeLessThanOrEqual(24);
  const frame = await page.locator('.town-review canvas').screenshot({ path: 'test-results/direct-skin/reference.png' });
  await page.screenshot({ path: 'test-results/direct-skin/comparison.png' });
  await page.getByRole('button', { name: 'Landmark / siluet', exact: true }).click();
  await expect(page.locator('.direct-inspect')).toBeVisible();
  await page.getByRole('button', { name: 'Landmark / siluet', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Putar 90°', exact: true }).click();
    await page.locator('.town-review canvas').screenshot({ path: `test-results/direct-skin/turn-${i}.png` });
  }
  await page.getByRole('button', { name: 'Tandai sisi tanpa sumber', exact: true }).click();
  await page.getByRole('button', { name: 'Sudut game', exact: true }).click();
  await page.locator('.town-review canvas').screenshot({ path: 'test-results/direct-skin/coverage.png' });
  await page.getByRole('button', { name: 'Wireframe', exact: true }).click();
  await page.locator('.town-review canvas').screenshot({ path: 'test-results/direct-skin/wireframe.png' });
  await page.getByRole('button', { name: 'Wireframe', exact: true }).click();
  await page.getByRole('button', { name: 'Tandai sisi tanpa sumber', exact: true }).click();
  await page.getByRole('button', { name: 'Sudut Stitch', exact: true }).click();
  await page.getByRole('button', { name: 'Uji kedalaman pintu', exact: true }).click();
  await page.locator('.town-review canvas').screenshot({ path: 'test-results/direct-skin/depth.png' });
  await page.getByRole('button', { name: 'Uji kedalaman pintu', exact: true }).click();
  await page.locator('.town-review-canvas').evaluate(el => { (el as HTMLElement).style.width = '360px'; });
  await page.waitForFunction(() => document.querySelector('canvas')!.width === 360 && document.querySelector('canvas')!.height === 366);
  await page.locator('.town-review canvas').screenshot({ path: 'test-results/direct-skin/native.png' });
  await page.getByRole('button', { name: 'Tanpa tekstur', exact: true }).click();
  expect(frame.equals(await page.locator('.town-review canvas').screenshot())).toBe(false);
  expect(images).toBe(1); expect(errors).toEqual([]);
});

test('failed direct-image prototype retains the existing building and material skin', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/town-center-direct/design.png', route => route.abort());
  await page.goto('/?buildingReview=town_center&appearance=direct');
  await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.locator('[data-direct-status]')).toHaveAttribute('data-direct-status', 'fallback');
  await expect(page.getByRole('button', { name: 'Dengan tekstur', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.town-review canvas')).toBeVisible(); expect(errors).toEqual([]);
});

test('one-building review shows the original Stitch source and the real Town Center model', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let atlasRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/building-skins/town-center/atlas.png')) atlasRequests++; });
  await page.goto('/?buildingReview=town_center');
  await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.locator('svg image')).toHaveAttribute('href', /ancient-sites-master\.jpg/);
  await expect(page.locator('.town-review canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dengan tekstur', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-skin-status]')).toHaveAttribute('data-skin-status', 'ready');
  await expect(page.locator('[data-model-draw-calls]')).toHaveAttribute('data-model-draw-calls', '8');
  await expect(page.locator('[data-model-textures]')).toHaveAttribute('data-model-textures', '1');
  const skinFrame = await page.locator('.town-review canvas').screenshot();
  await page.getByRole('button', { name: 'Tanpa tekstur', exact: true }).click();
  const baselineFrame = await page.locator('.town-review canvas').screenshot();
  expect(skinFrame.equals(baselineFrame)).toBe(false);
  await page.screenshot({ path: 'test-results/town-center-skin-baseline-review.png' });
  await page.getByRole('button', { name: 'Dengan tekstur', exact: true }).click();
  await page.screenshot({ path: 'test-results/town-center-reference-review.png' });
  await page.getByRole('button', { name: 'Sudut game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sudut game', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/town-center-game-review.png' });
  for (let turn = 0; turn < 4; turn++) {
    await page.getByRole('button', { name: 'Putar 90°', exact: true }).click();
    await page.locator('.town-review canvas').screenshot({ path: `test-results/town-center-skin-turn-${turn}.png` });
  }
  expect(atlasRequests).toBe(1);
  expect(errors).toEqual([]);
});

test('missing civic atlas keeps the review fallback and the real settlement usable', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/building-skins/town-center/atlas.png', route => route.abort());
  await page.goto('/?buildingReview=town_center');
  await expect(page.locator('[data-town-review-ready=true]')).toBeVisible();
  await expect(page.locator('[data-skin-status]')).toHaveAttribute('data-skin-status', 'fallback');
  await expect(page.getByRole('button', { name: 'Dengan tekstur', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tanpa tekstur', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/town-center-skin-unavailable.png' });
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await expect(page.getByRole('heading', { name: 'Civilization Town', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getCameraState().zoom)).toBeGreaterThan(1);
  expect(pageErrors).toEqual([]);
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
