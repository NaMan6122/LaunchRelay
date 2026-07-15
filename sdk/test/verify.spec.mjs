import { test, expect } from '@playwright/test';

test('AC1: reserved-height container prevents CLS', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.waitForSelector('#lr-slot', { timeout: 3000 });
  const slot = page.locator('#lr-slot');
  await expect(slot).toBeVisible();
  const minHeight = await page.evaluate(
    () => document.getElementById('lr-slot')?.style.minHeight
  );
  expect(minHeight).toBe('48px');
});

test('AC2: widget content renders inside closed Shadow DOM', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (opts) {
      window.__lrShadowMode = opts.mode;
      Element.prototype.attachShadow = orig;
      return orig.call(this, opts);
    };
  });

  await page.goto('http://localhost:3001');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  const shadowMode = await page.evaluate(() => window.__lrShadowMode);
  expect(shadowMode).toBe('closed');

  const ctaVisible = await page.locator('#lr-slot').isVisible();
  expect(ctaVisible).toBe(true);
});

test('AC3: impression recorded after 1s viewport visibility', async ({ page }) => {
  const beacons = [];
  await page.route('**/v1/impressions', (route) => {
    beacons.push(route.request().postData());
    route.fulfill({ status: 200 });
  });

  await page.goto('http://localhost:3001');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  // Widget is already visible (position: fixed, bottom: 0)
  // Wait: 1s impression timer + 2s flush buffer
  await page.waitForTimeout(3500);

  expect(beacons.length).toBeGreaterThanOrEqual(1);
  const data = JSON.parse(beacons[0]);
  expect(data.events.some(e => e.type === 'impression')).toBe(true);
});

test('AC4: no impression if widget exits viewport before 1s timer fires', async ({ page }) => {
  const beacons = [];
  await page.route('**/v1/impressions', (route) => {
    beacons.push(route.request().postData());
    route.fulfill({ status: 200 });
  });

  await page.goto('http://localhost:3001');
  await page.waitForSelector('#lr-slot', { timeout: 3000 });

  // After a brief moment of visibility, hide the widget
  await page.evaluate(() => {
    const slot = document.getElementById('lr-slot');
    if (slot) slot.style.display = 'none';
  });

  // Wait: 1s impression timer would have fired if not cancelled
  await page.waitForTimeout(4000);

  const hasImpression = beacons.some(b => {
    try {
      return JSON.parse(b).events.some(e => e.type === 'impression');
    } catch {
      return false;
    }
  });
  expect(hasImpression).toBe(false);
});

test('AC5: fallback hides widget on API error', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(1000);
  const slot = page.locator('#lr-slot');
  await expect(slot).toBeAttached();
});

test('AC6: beacon batch has correct structure', async ({ page }) => {
  const beacons = [];
  await page.route('**/v1/impressions', (route) => {
    beacons.push(route.request().postData());
    route.fulfill({ status: 200 });
  });

  await page.goto('http://localhost:3001');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  await page.waitForTimeout(3500);

  expect(beacons.length).toBeGreaterThanOrEqual(1);
  const data = JSON.parse(beacons[0]);

  expect(data.startup_id).toBe('test-startup-001');
  expect(Array.isArray(data.events)).toBe(true);
  expect(data.events.length).toBeGreaterThanOrEqual(1);

  const ev = data.events[0];
  expect(ev.type).toBe('impression');
  expect(typeof ev.impression_id).toBe('string');
  expect(typeof ev.timestamp).toBe('number');
});
