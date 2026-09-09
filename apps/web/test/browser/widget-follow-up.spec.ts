import { expect, test } from '@playwright/test';

test('a widget follow-up moves to the new turn without trapping scroll', async ({ page }) => {
  const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:16px;font:16px system-ui}button{min-height:44px;padding:12px 20px}</style></head><body><h2>Selected trip fixture</h2><button disabled>Find a stay</button><script>
    addEventListener('message', event => {
      if (event.source !== parent || event.data?.id !== 1) return;
      parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/initialized',params:{}},'*');
      parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/size-changed',params:{height:160}},'*');
      document.querySelector('button').disabled = false;
    });
    document.querySelector('button').onclick = () => parent.postMessage({jsonrpc:'2.0',id:2,method:'ui/message',params:{role:'user',content:[{type:'text',text:'Find a stay for my selected trip.'}]}},'*');
    parent.postMessage({jsonrpc:'2.0',id:1,method:'ui/initialize',params:{appInfo:{name:'Wayfare follow-up fixture',version:'1'},appCapabilities:{},protocolVersion:'2025-11-21'}},'*');
  </script></body></html>`;
  let turns = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'browser-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: 'http://127.0.0.1:3108/widget-fixture/turns', toolConfirmations: 'http://127.0.0.1:3108/widget-fixture/confirmations' },
  } }));
  await page.route('**/widget-fixture/turns', async route => {
    turns += 1;
    if (turns === 1) {
      await route.fulfill({ contentType: 'text/event-stream', body:
        frame('view_available', { id: 'review-view', tool: 'review_trip', resourceUri: 'ui://nuitee_travel_mcp_app_starter/review_trip_widget', result: { status: 'ready' }, html })
        + frame('content', { delta: Array.from({ length: 45 }, (_, i) => `Trip planning fixture paragraph ${i + 1}. Your selections remain in this conversation.`).join('\n\n') })
        + frame('done', {}),
      });
    } else {
      await pending;
      await route.fulfill({ contentType: 'text/event-stream', body: frame('content', { delta: 'Hotel search fixture complete.' }) + frame('done', {}) });
    }
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill('Review my selected trip');
  await page.getByRole('button', { name: 'Submit trip request' }).click();
  const host = page.locator('noodle-app-view').first();
  const app = host.locator('iframe').first().contentFrame().locator('iframe').contentFrame();
  await expect(app.getByRole('button', { name: 'Find a stay' })).toBeEnabled();
  await expect(page.getByText(/Trip planning fixture paragraph 45/)).toBeVisible();
  await host.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await app.getByRole('button', { name: 'Find a stay' }).click();
  await expect.poll(() => turns).toBe(2);
  const sent = page.getByRole('article', { name: 'Traveler message' }).filter({ hasText: 'Find a stay for my selected trip.' });
  await expect(sent).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 300);
  release();
  await expect(page.getByText('Hotel search fixture complete.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
