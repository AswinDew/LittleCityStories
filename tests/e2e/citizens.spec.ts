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
  expect(builder.room).toMatchObject({ purpose: 'work', phase: 'inside' });
  expect(builder.position).toEqual({ x: 14, z: 13.35 });
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(500));
  await page.screenshot({ path: 'test-results/m5-occlusion-front.png' });
  const after = await snapshot(page);
  expect(after.citizens[builder.id].room).toMatchObject({ purpose: 'home', phase: 'inside', hidden: true });
  expect(await page.evaluate(id => window.__CIV_TOWN_TEST__!.getCitizenViews().find(c => c.id === id)!.visible, builder.id)).toBe(false);
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
  expect(rested.citizens[citizenId].room).toMatchObject({ purpose: 'home', phase: 'inside', hidden: true });
  expect(await page.evaluate(id => window.__CIV_TOWN_TEST__!.getCitizenViews().find(c => c.id === id)!.visible, citizenId)).toBe(false);
  await page.getByRole('button', { name: `Unassign ${rested.citizens[citizenId].name}`, exact: true }).click();
  expect((await snapshot(page)).citizens[citizenId].workplaceId).toBeNull();
  expect(errors).toEqual([]);
});

test('construction shows growing final walls and roof before completion', async ({ page }) => {
  await page.goto('/?manual=1'); await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  await place(page, '1', 12, 12);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setCameraZoom(2));
  const id = Object.values((await snapshot(page)).buildings).find(b => b.defId === 'primitive_house')!.instanceId;
  const stages: { stage: string; parts: { stage: string; height: number }[] }[] = [];
  for (const fraction of [0.2, 0.4, 0.6, 0.8, 1]) {
    const view = await page.evaluate(({ id, fraction }) => {
      const h = window.__CIV_TOWN_TEST__!;
      for (let tick = 0; tick < 500 && h.getBuildingViews().find(v => v.id === id)!.progress < fraction; tick++) h.advanceTicks(1);
      return h.getBuildingViews().find(v => v.id === id)!;
    }, { id, fraction });
    expect(view.progress).toBeGreaterThanOrEqual(fraction);
    stages.push(view);
    await page.screenshot({ path: `test-results/assembly-${fraction}.png` });
  }
  expect(stages[0].parts.some(p => p.stage === 'frame')).toBe(true);
  expect(stages[0].parts.some(p => p.stage === 'wall')).toBe(false);
  const wall = (i: number) => stages[i].parts.find(p => p.stage === 'wall')!.height;
  expect(wall(2)).toBeGreaterThan(wall(1));
  expect(stages[3].parts.some(p => p.stage === 'roof')).toBe(true);
  expect(stages[4].stage).toBe('completed');
});

for (const [defId, x, z, animation] of [
  ['farm', 18, 12, 'harvest'], ['lumber_camp', 12, 14, 'chop'],
  ['stone_quarry', 19, 14, 'mine'], ['research_hut', 18, 12, 'research'],
] as const) test(`${defId} has an indoor work station and a distinct moving clip, then the citizen enters home`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (['warning', 'error'].includes(e.type())) errors.push(e.text()); });
  await page.goto('/?manual=1'); await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
  const result = await page.evaluate(({ defId, x, z }) => window.__CIV_TOWN_TEST__!.dispatch({ type: 'placeBuilding', defId, cell: { x, z }, rotation: 0 }), { defId, x, z });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  expect(await advanceUntil(page, { buildingId: result.instanceId! })).toBe(true);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(1)); // completed builders release their job on the next tick
  const id = Object.keys((await snapshot(page)).citizens)[0];
  expect((await page.evaluate(({ id, buildingId }) => window.__CIV_TOWN_TEST__!.dispatch({ type: 'assignWorker', citizenId: id, buildingId }), { id, buildingId: result.instanceId! })).ok).toBe(true);
  expect(await advanceUntil(page, { citizenId: id, activity: 'work' })).toBe(true);
  const citizen = (await snapshot(page)).citizens[id];
  expect(citizen.room).toMatchObject({ purpose: 'work', phase: 'inside', buildingId: result.instanceId });
  expect(citizen.animationState).toBe(animation);
  const frames = await page.evaluate(id => {
    const h = window.__CIV_TOWN_TEST__!, frames = new Set<string>();
    for (let tick = 0; tick < 15; tick++) { h.advanceTicks(1); const c = h.getCitizenViews().find(c => c.id === id)!; frames.add(JSON.stringify(c.frame)); }
    return [...frames];
  }, id);
  expect(frames.length).toBeGreaterThanOrEqual(4);
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.setCameraZoom(2.8));
  await page.screenshot({ path: `test-results/work-${defId}.png` });
  await page.evaluate(id => window.__CIV_TOWN_TEST__!.dispatch({ type: 'unassignWorker', citizenId: id }), id);
  expect(await advanceUntil(page, { citizenId: id, activity: 'idle' })).toBe(true);
  expect((await snapshot(page)).citizens[id].room).toMatchObject({ purpose: 'home', phase: 'inside', hidden: true });
  expect(await page.evaluate(id => window.__CIV_TOWN_TEST__!.getCitizenViews().find(c => c.id === id)!.visible, id)).toBe(false);
  expect(errors).toEqual([]);
});
