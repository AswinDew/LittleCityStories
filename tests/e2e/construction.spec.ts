import { test, expect, type Page } from '@playwright/test';

const open = async (page: Page) => {
  await page.goto('/?manual=1');
  await page.waitForFunction(() => !!window.__CIV_TOWN_TEST__);
};
const state = (page: Page) => page.evaluate(() => window.__CIV_TOWN_TEST__!.getSnapshot());
const point = (page: Page, x = 12, z = 12) => page.evaluate(cell => window.__CIV_TOWN_TEST__!.gridToScreen(cell), { x, z });

test('places one paid scaffold, rejects overlap, selects and cancels through the inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await open(page);
  const initial = await state(page);
  await expect(page.locator('[data-resource=wood] strong')).toHaveText('160');
  await page.locator('[data-def-id=primitive_house]').click();
  const tile = await point(page);
  await page.mouse.click(tile.x, tile.y);
  const built = await state(page);
  expect(built.resources).toEqual({ wood: 130, stone: 90, food: 90, coins: 50 });
  expect(Object.keys(built.buildings)).toHaveLength(2);
  const site = Object.values(built.buildings).find(building => building.defId === 'primitive_house')!;
  expect(site.status).toBe('planned');
  expect(await page.evaluate(id => window.__CIV_TOWN_TEST__!.getBuildingViews().find(view => view.id === id)?.stage, site.instanceId)).toBe('planned');
  await page.mouse.click(tile.x, tile.y);
  expect((await state(page)).resources).toEqual(built.resources);
  await expect(page.getByRole('status')).toContainText('Tile sudah ditempati');
  await page.keyboard.press('Escape'); await page.mouse.click(tile.x, tile.y);
  await expect(page.locator('[data-building-status=planned]')).toContainText('Menunggu builder');
  await page.evaluate(() => window.__CIV_TOWN_TEST__!.advanceTicks(1000));
  expect((await state(page)).buildings[site.instanceId].workTicks).toBe(0);
  await page.screenshot({ path: 'test-results/m3-construction.png' });
  await page.getByRole('button', { name: 'Cancel construction', exact: true }).click();
  expect((await state(page)).resources).toEqual(initial.resources);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getBuildingViews().length)).toBe(1);
  await expect(page.getByLabel('Building inspector')).toBeHidden();
  expect(errors).toEqual([]);
});

test('finishes roads instantly, demolishes once, protects Town Center and clears sources without yield', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Infrastructure', exact: true }).click();
  await page.locator('[data-def-id=dirt_road]').click();
  const tile = await point(page);
  await page.mouse.click(tile.x, tile.y);
  expect((await state(page)).resources.stone).toBe(99);
  await page.keyboard.press('Escape'); await page.mouse.click(tile.x, tile.y);
  await expect(page.locator('[data-building-status=completed]')).toHaveText('Selesai');
  await page.getByRole('button', { name: 'Demolish building', exact: true }).click();
  expect((await state(page)).resources.stone).toBe(99);
  expect(await page.evaluate(() => window.__CIV_TOWN_TEST__!.getBuildingViews().length)).toBe(1);
  await page.keyboard.press('b');
  const town = Object.values((await state(page)).buildings)[0];
  const center = await point(page, town.gridX + 1, town.gridZ + 1);
  await page.mouse.click(center.x, center.y);
  expect(Object.keys((await state(page)).buildings)).toHaveLength(1);
  await expect(page.getByRole('status')).toContainText('Town Center dilindungi');
  const before = await state(page), tree = before.world.environment.find(object => object.kind === 'tree')!;
  await page.keyboard.press('c');
  const source = await point(page, tree.x, tree.z);
  await page.mouse.click(source.x, source.y);
  expect((await state(page)).world.environment.some(object => object.id === tree.id)).toBe(false);
  expect((await state(page)).resources).toEqual(before.resources);
});

test('ignores drag, modified/right clicks, canceled gestures, orphan pointerup and HUD clicks', async ({ page }) => {
  await open(page); await page.keyboard.press('1');
  const before = await state(page), tile = await point(page);
  await page.mouse.move(tile.x, tile.y); await page.mouse.down();
  await page.mouse.move(tile.x + 10, tile.y, { steps: 3 }); await page.mouse.move(tile.x, tile.y); await page.mouse.up();
  await page.mouse.click(tile.x, tile.y, { button: 'right' });
  await page.keyboard.down('Shift'); await page.mouse.click(tile.x, tile.y); await page.keyboard.up('Shift');
  const event = { pointerId: 77, button: 0, clientX: tile.x, clientY: tile.y, isPrimary: true, bubbles: true };
  await page.locator('canvas').dispatchEvent('pointerup', event);
  await page.locator('canvas').dispatchEvent('pointerdown', event);
  await page.locator('canvas').dispatchEvent('pointercancel', event);
  await page.locator('canvas').dispatchEvent('pointerup', event);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const tab = (await page.getByRole('button', { name: 'Housing', exact: true }).boundingBox())!;
  await page.mouse.move(tile.x, tile.y); await page.mouse.down();
  await page.mouse.move(tab.x + 10, tab.y + 10, { steps: 5 }); await page.mouse.up();
  expect(await state(page)).toEqual(before);
});
