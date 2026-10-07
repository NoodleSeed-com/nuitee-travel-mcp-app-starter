import { expect, test } from '@playwright/test';

test('a successful retry removes the failed App and recovery controls', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const fixture = window as typeof window & { searchEvent: (event: string, data: unknown) => void };
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.endsWith('/search-recovery-fixture/turns')) return nativeFetch(input, init);
      const stream = new ReadableStream({ start(controller) {
        fixture.searchEvent = (event, data) => {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          if (event === 'done') controller.close();
        };
        fixture.searchEvent('tool_started', { id: 'search-one', tool: 'search_flights' });
      } });
      return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'browser-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: `${baseURL}/search-recovery-fixture/turns`, toolConfirmations: `${baseURL}/search-recovery-fixture/confirmations` },
  } }));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill('London to Rome on November 12');
  await page.getByRole('button', { name: 'Submit trip request' }).click();
  await expect(page.getByRole('region', { name: 'Travel conversation' })).toBeVisible();
  await page.waitForFunction(() => typeof (window as typeof window & { searchEvent?: unknown }).searchEvent === 'function');
  await page.evaluate(() => {
    const emit = (window as typeof window & { searchEvent: (event: string, data: unknown) => void }).searchEvent;
    const result = { status: 'error', error: { code: 'provider_error', retryable: true } };
    emit('tool_completed', { id: 'search-one', tool: 'search_flights', result });
    emit('view_available', { id: 'search-one', tool: 'search_flights', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget', result });
  });
  await expect(page.locator('noodle-app-view')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Recover flight search' })).toBeVisible();
  await page.evaluate(() => {
    const emit = (window as typeof window & { searchEvent: (event: string, data: unknown) => void }).searchEvent;
    const result = { status: 'success', searchContext: { origin: 'LHR', destination: 'FCO', departureDate: '2026-11-12', adults: 1, children: 0, infants: 0 } };
    emit('tool_started', { id: 'search-two', tool: 'search_flights' });
    emit('tool_completed', { id: 'search-two', tool: 'search_flights', result });
    emit('view_available', { id: 'search-two', tool: 'search_flights', resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget', result,
      html: '<!doctype html><html><body><h2>Recovered flight results fixture</h2></body></html>' });
    emit('content', { delta: 'Your flight search is ready.' });
    emit('done', {});
  });
  await expect(page.getByText('Your flight search is ready.')).toBeVisible();
  await expect(page.locator('noodle-app-view')).toHaveCount(1);
  await expect(page.getByRole('group', { name: 'Recover flight search' })).toHaveCount(0);
  const app = page.locator('noodle-app-view iframe').first().contentFrame().locator('iframe').contentFrame();
  await expect(app.getByRole('heading', { name: 'Recovered flight results fixture' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.screenshot({ path: test.info().outputPath('recovered-search.png'), fullPage: true });
});
