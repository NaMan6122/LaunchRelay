import { test, expect } from '@playwright/test';

const DIST_WIDGET = 'http://localhost:3001/dist/widget.js';

function servePage(route, html) {
  route.fulfill({ contentType: 'text/html', body: `<!DOCTYPE html><html lang="en"><body>${html}</body></html>` });
}

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

  await page.evaluate(() => {
    const slot = document.getElementById('lr-slot');
    if (slot) slot.style.display = 'none';
  });

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
  await page.route('**/v1/match?*', route => route.abort('connectionrefused'));
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(1000);
  const slot = page.locator('#lr-slot');
  await expect(slot).toBeHidden();
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

  expect(data.viewer_startup_id).toBe('test-startup-001');
  expect(Array.isArray(data.events)).toBe(true);
  expect(data.events.length).toBeGreaterThanOrEqual(1);

  const ev = data.events[0];
  expect(ev.type).toBe('impression');
  expect(typeof ev.impression_id).toBe('string');
  expect(typeof ev.shown_startup_id).toBe('string');
  expect(typeof ev.timestamp).toBe('number');
});

test('AC7: badge format renders circular badge with popover on click', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (opts) {
      return orig.call(this, { ...opts, mode: 'open' });
    };
  });

  await page.route('**/v1/match?*', route => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        match: { id: 'b1', name: 'Badge Co', one_line_pitch: 'Cool stuff', url: 'https://badge.example.com', logo_url: '', category: ['tech'] },
        impression_id: 'imp_badge',
      }),
    });
  });

  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-badge" data-format="badge" data-position="bottom" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot', { timeout: 5000 });
  const slot = page.locator('#lr-slot');
  await expect(slot).toBeAttached();

  const borderRadius = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    return s.style.borderRadius;
  });
  expect(borderRadius).toBe('50%');

  const popoverHidden = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const pop = root.querySelector('.lr-popover');
    return pop && getComputedStyle(pop).display === 'none';
  });
  expect(popoverHidden).toBe(true);

  await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const trigger = root.querySelector('.lr-badge-trigger');
    trigger.click();
  });

  const popoverShown = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const pop = root.querySelector('.lr-popover');
    return pop && pop.style.display === 'block';
  });
  expect(popoverShown).toBe(true);
});

test('AC8: card format renders as inline block-level element (not fixed)', async ({ page }) => {
  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-card" data-format="card" data-theme="light" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot', { timeout: 5000 });
  const slot = page.locator('#lr-slot');
  await expect(slot).toBeAttached();

  const isFixed = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    return s.style.position === 'fixed';
  });
  expect(isFixed).toBe(false);

  const width = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    return s.style.width;
  });
  expect(width).toBe('100%');
});

test('AC9: dark theme applies dark background to widget', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (opts) {
      return orig.call(this, { ...opts, mode: 'open' });
    };
  });

  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-dark" data-theme="dark" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  const styleText = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const style = root.querySelector('style');
    return style ? style.textContent : '';
  });

  expect(styleText).toContain('#1a1a1a');
});

test('AC10: UTM parameters appended to CTA link', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (opts) {
      return orig.call(this, { ...opts, mode: 'open' });
    };
  });

  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-utm" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  const utmHref = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const cta = root.querySelector('.lr-cta');
    return cta ? cta.getAttribute('href') : null;
  });

  expect(utmHref).toContain('utm_source=launchrelay');
  expect(utmHref).toContain('utm_medium=widget');
  expect(utmHref).toContain('utm_campaign=partner_');
});

test('AC11: 204 No Content renders placeholder with directory link', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (opts) {
      return orig.call(this, { ...opts, mode: 'open' });
    };
  });

  await page.route('**/v1/match?*', route => {
    route.fulfill({ status: 204 });
  });

  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-204" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  const placeholderInfo = await page.evaluate(() => {
    const s = document.getElementById('lr-slot');
    const root = s.shadowRoot;
    const ph = root.querySelector('.lr-placeholder');
    const link = ph ? ph.querySelector('a') : null;
    return { text: ph ? ph.textContent : null, href: link ? link.getAttribute('href') : null };
  });
  expect(placeholderInfo.text).toContain('Supporting indie founders');
  expect(placeholderInfo.href).toContain('launchrelay.com/directory');
});

test('AC12: Bearer token sent in Authorization header', async ({ page }) => {
  let authHeader = null;
  await page.route('**/v1/match?*', (route) => {
    authHeader = route.request().headers()['authorization'];
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        match: { id: 't1', name: 'Token Test', one_line_pitch: 'Testing tokens', url: 'https://token.example.com', logo_url: '', category: ['tech'] },
        impression_id: 'imp_token',
      }),
    });
  });

  await page.route('http://localhost:3001/', route => servePage(route,
    `<script src="${DIST_WIDGET}" data-startup-id="test-token" data-token="my-secret-token-123" async></script>`
  ));

  await page.goto('http://localhost:3001/');
  await page.waitForSelector('#lr-slot[data-lr-ready]', { timeout: 5000 });

  expect(authHeader).toBe('Bearer my-secret-token-123');
});
