import { test, expect, type Page } from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
const advanceUntil = (page: Page, condition: { direction?: string; activity?: string; buildingId?: string; citizenId?: string }, max = 1000) =>
  page.evaluate(({ condition, max }) => {
    const hooks = window.__CIV_TOWN_TEST__!;
    for (let tick = 0; tick < max; tick++) {
      const state = hooks.getSnapshot();
      if (condition.buildingId ? state.buildings[condition.buildingId]?.status === 'completed' :
          Object.values(state.citizens).some(c => (!condition.citizenId || c.id === condition.citizenId) &&
            (!condition.direction || (c.direction === condition.direction && c.animationState === 'walk')) && (!condition.activity || c.activity === condition.activity))) return true;
      hooks.advanceTicks(condition.direction ? 1 : 5);
    }
    return false;
  }, { condition, max });
const place = async (page: Page, key: string, x: number, z: number) => {
  await page.keyboard.press(key);
  const point = await page.evaluate(cell => window.__CIV_TOWN_TEST__!.gridToScreen(cell), { x, z });
  await page.mouse.click(point.x, point.y); await page.keyboard.press('Escape'); await page.mouse.click(point.x, point.y);
};

test('population header and worker inspector stay clear of hints and zoom controls', async ({ page }) => {
  await page.goto('/?manual=1'); await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await place(page, '3', 18, 12);
  const boxes = await page.evaluate(() => {
    const box = (selector: string) => { const r = document.querySelector(selector)!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    return { title: box('.settlement-title'), hints: box('.construction-hints'), inspector: box('.construction-inspector'), zoom: box('.camera-zoom') };
  });
  expect(boxes.hints.top).toBeGreaterThanOrEqual(boxes.title.bottom + 8);
  expect(boxes.zoom.right).toBeLessThanOrEqual(boxes.inspector.left - 8);
});

test('keeps the chosen available worker and focus through unrelated simulation ticks', async ({ page }) => {
  await page.goto('/?manual=1'); await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await place(page, '3', 18, 12);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(400));
  const select = page.getByLabel('Available worker');
  await select.selectOption({ index: 1 }); await select.focus();
  const chosen = await select.inputValue();
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(1));
  await expect(select).toHaveValue(chosen); await expect(select).toBeFocused();
  await select.selectOption({ index: 2 }); await select.focus();
  const kept = await select.inputValue();
  await page.evaluate(() => {
    const hooks = window.__CIV_TOWN_TEST__!, state = hooks.getSnapshot();
    const farm = Object.values(state.buildings).find(b => b.defId === 'farm')!;
    hooks.dispatch({ type: 'assignWorker', citizenId: Object.keys(state.citizens)[0], buildingId: farm.instanceId });
  });
  await expect(select).toHaveValue(kept); await expect(select).toBeFocused();
});

test('real builder sprites render behind and in front of buildings at maximum zoom', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/?manual=1'); await page.waitForFunction(() => window.__CIV_TOWN_TEST__?.getCitizenViews().length === 3);
  await place(page, '1', 14, 13);
  expect(await advanceUntil(page, { activity: 'work' })).toBe(true);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setCameraZoom(2.8));
  await page.screenshot({ path: 'test-results/m5-occlusion-behind.png' });
  const state = await snapshot(page), builder = Object.values(state.citizens).find(c => c.occupation === 'builder')!;
  expect(builder.position).toEqual({ x: 14, z: 14 });
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(500));
  await page.screenshot({ path: 'test-results/m5-occlusion-front.png' });
  const after = await snapshot(page);
  expect(after.citizens[builder.id].position).toEqual({ x: 16, z: 18 });
});

test('real citizens build, walk in all four directions, work at a farm and return home', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.goto('/?manual=1');
  await page.waitForFunction(() => window.__CIV_TOWN_TEST__?.getCitizenViews().length === 3);
  await expect(page.locator('[data-population]')).toHaveText('3 warga / 3 tempat');
  await place(page, '1', 12, 12);
  const house = Object.values((await snapshot(page)).buildings).find(b => b.defId === 'primitive_house')!;
  for (const direction of ['NW', 'NE', 'SE', 'SW']) {
    expect(await advanceUntil(page, { direction })).toBe(true);
    await expect.poll(() => page.evaluate(direction => window.__CIV_TOWN_TEST__!.getCitizenViews().some(view => view.direction === direction && view.activity === 'walk'), direction)).toBe(true);
    await page.screenshot({ path: `test-results/m5-walk-${direction}.png` });
  }
  expect((await snapshot(page)).buildings[house.instanceId].status).toBe('completed');
  await expect(page.locator('[data-building-status=completed]')).toHaveText('Selesai');
  await place(page, '3', 18, 12);
  const farm = Object.values((await snapshot(page)).buildings).find(b => b.defId === 'farm')!;
  expect(await advanceUntil(page, { buildingId: farm.instanceId })).toBe(true);
  await expect(page.locator('[data-operating-status=no_workers]')).toContainText('Menunggu pekerja');
  const citizenId = await page.getByLabel('Available worker').inputValue();
  await page.getByRole('button', { name: 'Assign worker', exact: true }).click();
  expect((await snapshot(page)).citizens[citizenId].occupation).toBe('farmer');
  expect(await advanceUntil(page, { citizenId, activity: 'work' })).toBe(true);
  await expect(page.locator('[data-operating-status=working]')).toContainText('Bekerja');
  const before = await snapshot(page);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(100));
  const after = await snapshot(page), meals = Math.floor(after.tick / 600) - Math.floor(before.tick / 600);
  expect(after.resources.food).toBe(before.resources.food + 3 - meals * Object.keys(before.citizens).length);
  for (const [label, zoom] of [['minimum', 0.5], ['normal', 1], ['maximum', 2.8]] as const) {
    await page.evaluate(zoom => window.__CIV_TOWN_TEST__!.setCameraZoom(zoom), zoom);
    await page.screenshot({ path: `test-results/m5-citizens-${label}.png` });
  }
  expect(await advanceUntil(page, { citizenId, activity: 'return' })).toBe(true);
  expect(await advanceUntil(page, { citizenId, activity: 'idle' })).toBe(true);
  const rested = await snapshot(page);
  expect(rested.citizens[citizenId].position).toEqual(rested.buildings[rested.citizens[citizenId].homeId!].entrance);
  await page.getByRole('button', { name: `Unassign ${rested.citizens[citizenId].name}`, exact: true }).click();
  expect((await snapshot(page)).citizens[citizenId].workplaceId).toBeNull();
  expect(errors).toEqual([]);
});
