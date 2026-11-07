import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:4174/exports/town-center-skin/review.html');
  await page.waitForFunction(() => [...document.querySelectorAll('article img')].length === 5 &&
    [...document.querySelectorAll('article img')].every(image => image.complete && image.naturalWidth >= 512));
  const images = await page.locator('article img').evaluateAll(items => items.map(image => ({
    alt: image.alt, width: image.naturalWidth, height: image.naturalHeight, complete: image.complete,
  })));
  assert.equal(images.length, 5);
  assert.ok(images.every(image => image.width === image.height && image.complete));
  for (const href of ['source-spec.json', 'source-audit.json', '../../designs/town-center-skin/board.source.html']) {
    const response = await page.request.get(new URL(href, page.url()).href);
    assert.equal(response.status(), 200, href);
  }
  await page.screenshot({ path: fileURLToPath(new URL('review-screenshot.png', import.meta.url)), fullPage: true });
  await page.locator('.grid').screenshot({ path: fileURLToPath(new URL('swatches-overview.png', import.meta.url)) });
  await page.locator('details').evaluateAll(items => items.forEach(item => { item.open = true; }));
  await page.screenshot({ path: fileURLToPath(new URL('repeat-screenshot.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: fileURLToPath(new URL('mobile-screenshot.png', import.meta.url)), fullPage: true });
  assert.deepEqual(errors, []);
  const report = { images, consoleErrors: errors, narrowViewportWidth: 390, horizontalOverflow: false };
  await writeFile(fileURLToPath(new URL('browser-audit.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
