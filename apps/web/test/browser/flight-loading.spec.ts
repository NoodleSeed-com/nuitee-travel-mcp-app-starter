import { expect, test } from '@playwright/test';
import { runBrowserScenario } from '../../../../scripts/benchmark-flight-search.mjs';

test('flight loading settles before final prose and slow searches do not resend', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const fixture = window as typeof window & { flightEvent: (event: string, data: unknown) => void };
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.endsWith('/flight-loading-fixture/turns')) return nativeFetch(input, init);
      return Promise.resolve(new Response(new ReadableStream({ start(controller) {
        fixture.flightEvent = (event, data) => {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          if (event === 'done') controller.close();
        };
        fixture.flightEvent('tool_started', { id: 'flight-1', tool: 'search_flights' });
      } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'browser-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: 'http://127.0.0.1:3108/flight-loading-fixture/turns', toolConfirmations: 'http://127.0.0.1:3108/flight-loading-fixture/confirmations' },
  } }));
  await page.goto('/');
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  await page.clock.install({ time: new Date() });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill('LHR to FCO on November 12, one adult');
  await page.getByRole('button', { name: 'Submit trip request' }).click();
  const skeleton = page.locator('.travel-flight-loading');
  await expect(skeleton).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Searching current flights…');
  expect(await skeleton.getAttribute('aria-hidden')).toBe('true');
  await page.screenshot({ path: test.info().outputPath('flight-skeleton.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('status')).toHaveText('This search is taking longer than expected.');
  await expect(skeleton).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop generating' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('flight-slow.png'), fullPage: true });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.getByRole('button', { name: 'Stop generating' }).focus();
  await expect(page.getByRole('button', { name: 'Stop generating' })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('flight-slow-large-text.png'), fullPage: true });
  await page.evaluate(() => (window as typeof window & { flightEvent: (event: string, data: unknown) => void }).flightEvent('view_available', {
    id: 'flight-1', tool: 'search_flights', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
    result: { status: 'partial' }, html: '<!doctype html><html><body><h2>Flight results fixture</h2><p>One current fare</p></body></html>',
  }));
  const app = page.locator('noodle-app-view').first().locator('iframe').first().contentFrame().locator('iframe').contentFrame();
  await expect(app.getByRole('heading', { name: 'Flight results fixture' })).toBeVisible();
  await expect(page.getByText('This search is taking longer than expected.')).toHaveCount(0);
  await expect(skeleton).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Travel conversation' })).toHaveAttribute('aria-busy', 'true');
  await page.evaluate(() => (window as typeof window & { flightEvent: (event: string, data: unknown) => void }).flightEvent('done', {}));
});

for (const scenario of [
  { outcome: 'partial', delayedResult: false },
  { outcome: 'success', delayedResult: true },
  { outcome: 'empty', delayedResult: true },
  { outcome: 'error', delayedResult: true },
] as const) {
test(`benchmark observes ${scenario.outcome} with delayed ${scenario.delayedResult ? 'widget' : 'prose'} without saving session data`, async ({ page }) => {
  await page.addInitScript(({ outcome, delayedResult }) => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (!String(input instanceof Request ? input.url : input).endsWith('/benchmark-fixture/turns')) return nativeFetch(input, init);
      return Promise.resolve(new Response(new ReadableStream({ start(controller) {
        const send = (event: string, data: unknown) => controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        send('tool_started', { id: 'benchmark-1', tool: 'search_flights' });
        const content = outcome === 'empty' ? '<h2>No flights found</h2>'
          : outcome === 'error' ? '<h2>We couldn\'t load your flight options</h2>'
          : `<h2>Flight options</h2>${outcome === 'partial' ? '<p>Some Provider Results Were Incomplete</p>' : ''}<p>Example Air, GBP 100</p><button aria-label="Select fare from QZX to QZY with Example Air">Select</button>`;
        send('view_available', {
          id: 'benchmark-1', tool: 'search_flights', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget', result: { status: outcome },
          html: delayedResult ? `<!doctype html><html><body><script>setTimeout(() => { document.body.innerHTML = ${JSON.stringify(content)}; }, 1000);</script></body></html>` : `<!doctype html><html><body>${content}</body></html>`,
        });
        setTimeout(() => { send('done', {}); controller.close(); }, delayedResult ? 0 : 3_000);
      } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  }, scenario);
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'private-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: 'http://127.0.0.1:3108/benchmark-fixture/turns', toolConfirmations: 'http://127.0.0.1:3108/benchmark-fixture/confirmations' },
  } }));
  await page.goto('/');
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  const result = await runBrowserScenario(page, { id: 'fixture', session: 'fresh', origin: 'QZX', destination: 'QZY', departureDate: '2030-01-12', currency: 'GBP', country: 'GB' });
  expect(result.outcome).toBe(scenario.outcome);
  if (scenario.outcome === 'partial') expect(result.firstFareMs!).toBeLessThan(result.turnMs!);
  else if (scenario.outcome === 'success') expect(result.firstFareMs!).toBeGreaterThan(result.turnMs!);
  else expect(result.firstFareMs).toBeUndefined();
  expect(JSON.stringify(result)).not.toMatch(/private-fixture-token|Example Air|QZX|QZY/);
});
}
