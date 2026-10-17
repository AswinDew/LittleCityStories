import { test, expect } from '@playwright/test';

test('32×32 world renders, has layers and deterministic test controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'warning' || message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/?manual=1');
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!window.__CIV_TOWN_TEST__)).toBe(true);
  const initial = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  expect(initial.config.metrics.size).toBe(32);
  expect(initial.world.grid).toHaveLength(32);
  expect(initial.tick).toBe(0);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSceneGroups())).toEqual(
    expect.arrayContaining(['terrain', 'roads', 'BuildingsGroup', 'vegetation', 'citizens', 'EffectsGroup', 'selection']));
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(10));
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBe(10);
  expect(Object.values(initial.buildings).map(building => building.defId)).toEqual(['town_center']);
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getRenderCalls())).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/m1-foundation.png' });
});

test('camera pans, zooms and resizes without changing the logical map', async ({ page }) => {
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  const before = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getCameraState());
  await page.mouse.move(640, 320);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getCameraState().zoom)).toBeGreaterThan(before.zoom);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(740, 350, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getCameraState().target.x)).not.toBe(before.target.x);
  await page.keyboard.press('q');
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getCameraState().rotation)).toBeCloseTo(Math.PI / 4);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(() => page.locator('canvas').evaluate(canvas => canvas.clientWidth)).toBe(1920);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().world.grid.length)).toBe(32);
});

test('road placement uses session resources and cannot overlap environment', async ({ page }) => {
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await page.keyboard.press('2');
  const tree = await page.evaluate(() => {
    const hooks = window.__CIV_TOWN_TEST__!;
    const source = hooks.getSnapshot().world.environment.find(object => object.kind === 'tree')!;
    return hooks.gridToScreen(source);
  });
  await page.mouse.click(tree.x, tree.y);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().resources.stone)).toBe(100);
  expect(Object.keys(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().buildings))).toHaveLength(1);
  const point = await page.evaluate(() => window.__CIV_TOWN_TEST__!.gridToScreen({ x: 12, z: 12 }));
  await page.mouse.click(point.x, point.y);
  const state = await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
  expect(Object.keys(state.buildings)).toHaveLength(2);
  expect(state.resources.stone).toBe(99);
  expect(state.world.grid[12][12].isRoad).toBe(true);
  await page.keyboard.press('b');
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().resources.stone)).toBe(99);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().world.grid[12][12].isRoad)).toBe(false);
});

test('live scheduler advances independently and respects pause and speed', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBeGreaterThan(1);
  const paused = await page.evaluate(() => {
    const hooks = window.__CIV_TOWN_TEST__!;
    hooks.setSpeed(0);
    return hooks.getSnapshot().tick;
  });
  // A render-frame observation window proves rendering does not advance the paused simulation.
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = () => { if (++frames >= 10) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBe(paused);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setSpeed(2));
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBeGreaterThan(paused);
});

test('page cache lifecycle retains the canvas and manual pause before resuming', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  const paused = await page.evaluate(() => {
    window.__CIV_TOWN_TEST__!.setSpeed(0);
    const tick = window.__CIV_TOWN_TEST__!.getSnapshot().tick;
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    return tick;
  });
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBe(paused);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setSpeed(1));
  await expect.poll(() => page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot().tick)).toBeGreaterThan(paused);
});
