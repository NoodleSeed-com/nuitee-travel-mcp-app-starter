import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('hotel skeleton matches the carousel and leaves as soon as its App arrives', async ({ page }) => {
  // Keep the stream open after the view, reproducing the production ordering.
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const fixture = window as typeof window & { hotelEvent: (event: string, data: unknown) => void };
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.endsWith('/hotel-skeleton-fixture/turns')) return nativeFetch(input, init);
      const stream = new ReadableStream({ start(controller) {
        fixture.hotelEvent = (event, data) => {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          if (event === 'done') controller.close();
        };
        fixture.hotelEvent('tool_started', { id: 'hotel-search', tool: 'search_hotels' });
      } });
      return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'browser-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: 'http://127.0.0.1:3108/hotel-skeleton-fixture/turns', toolConfirmations: 'http://127.0.0.1:3108/hotel-skeleton-fixture/confirmations' },
  } }));
  // Use the real widget styles and its frame/carousel wrappers, not a second
  // width constant in the test. No provider, model, or image requests are made.
  const styles = await Promise.all([
    '../../node_modules/@noodleseed/one/react/styles.css',
    '../../src/views/travel.css', '../../src/views/hotel-journey.css',
  ].map(path => readFile(new URL(path, new URL('../../', import.meta.url)), 'utf8')));
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles.join('\n')}</style></head><body><section class="cc-app cc-hotel-journey nsr-frame"><div class="nsr-frame-surface"><h2>Hotel results fixture</h2><div class="nsr-frame-body"><div class="cc-card-carousel"><div class="cc-card-carousel-track cc-stay-shortlist">${[1, 2, 3].map(i => `<div class="cc-card-carousel-item"><article class="cc-stay-card"><div class="cc-stay-photo"></div><div class="cc-stay-card-body"><h3>Fixture stay ${i}</h3><p>Lisbon</p></div></article></div>`).join('')}</div></div></div></div></section></body></html>`;
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill('Hotels in Lisbon next week');
  await page.getByRole('button', { name: 'Submit trip request' }).click();
  const skeleton = page.locator('.travel-hotel-skeleton').first();
  await expect(skeleton).toBeVisible();
  const before = await skeleton.boundingBox();
  const panel = await page.locator('.travel-hotel-loading__panel').boundingBox();
  const beforePhoto = await page.locator('.travel-hotel-skeleton__photo').first().boundingBox();
  await page.screenshot({ path: test.info().outputPath('hotel-skeleton.png'), fullPage: true });
  await page.evaluate(html => (window as typeof window & { hotelEvent: (event: string, data: unknown) => void }).hotelEvent('view_available', {
    id: 'hotel-search', tool: 'search_hotels', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_hotels_widget', result: { status: 'success' }, html,
  }), html);
  const host = page.locator('noodle-app-view').first();
  const app = host.locator('iframe').first().contentFrame().locator('iframe').contentFrame();
  await expect(app.getByRole('heading', { name: 'Hotel results fixture' })).toBeVisible();
  await expect(page.locator('.travel-hotel-loading')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Travel conversation' })).toHaveAttribute('aria-busy', 'true');
  const after = await app.locator('.cc-stay-card').first().boundingBox();
  const afterPanel = await app.locator('.nsr-frame-surface').boundingBox();
  const afterPhoto = await app.locator('.cc-stay-photo').first().boundingBox();
  const renderedStyles = await app.locator('.cc-card-carousel-track').evaluate(el => {
    const properties = (node: Element) => { const s = getComputedStyle(node); return { padding: s.padding, border: s.borderWidth, boxSizing: s.boxSizing, gap: s.gap, width: s.width }; };
    return { track: properties(el), surface: properties(document.querySelector('.nsr-frame-surface')!), card: properties(document.querySelector('.cc-stay-card')!) };
  });
  const geometry = JSON.stringify({ before, after, panel, afterPanel, renderedStyles });
  expect(Math.abs(before!.width - after!.width), geometry).toBeLessThanOrEqual(1);
  // Nested iframe scrolling can consume the track's 2px edge padding.
  expect(Math.abs(before!.x - after!.x), geometry).toBeLessThanOrEqual(2);
  expect(Math.abs(panel!.width - afterPanel!.width), geometry).toBeLessThanOrEqual(1);
  expect(beforePhoto!.height).toBe(afterPhoto!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.evaluate(() => (window as typeof window & { hotelEvent: (event: string, data: unknown) => void }).hotelEvent('done', {}));
});
