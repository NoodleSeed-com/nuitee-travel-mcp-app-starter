import { expect, test } from '@playwright/test';

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
test(`a widget follow-up scrolls with loading feedback (${reducedMotion})`, async ({ page, baseURL }, testInfo) => {
  await page.emulateMedia({ reducedMotion });
  const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const modelContext = {
    content: [{ type: 'text', text: 'Use the selected trip details. Do not repeat the trip review. Ask only for missing stay dates.' }],
    structuredContent: { tripPlanning: { context: { destination: 'NRT', currency: 'GBP' } } },
  };
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:16px;font:16px system-ui}button{min-height:44px;padding:12px 20px}</style></head><body><h2>Selected trip fixture</h2><button disabled>Find a stay</button><script>
    addEventListener('message', event => {
      if (event.source !== parent) return;
      if (event.data?.id === 1) {
        parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/initialized',params:{}},'*');
        parent.postMessage({jsonrpc:'2.0',method:'ui/notifications/size-changed',params:{height:160}},'*');
        document.querySelector('button').disabled = false;
      }
      if (event.data?.id === 2 && !event.data.error) {
        parent.postMessage({jsonrpc:'2.0',id:3,method:'ui/message',params:{role:'user',content:[{type:'text',text:'Find a stay for my selected trip.'}]}},'*');
      }
    });
    document.querySelector('button').onclick = () => parent.postMessage({jsonrpc:'2.0',id:2,method:'ui/update-model-context',params:${JSON.stringify(modelContext)}},'*');
    parent.postMessage({jsonrpc:'2.0',id:1,method:'ui/initialize',params:{appInfo:{name:'Wayfare follow-up fixture',version:'1'},appCapabilities:{},protocolVersion:'2025-11-21'}},'*');
  </script></body></html>`;
  let turns = 0;
  let followUpRequest: unknown;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/v1/assistant/public-sessions', route => route.fulfill({ json: {
    token: 'browser-fixture-token', expiresAt: '2099-01-01T00:00:00.000Z',
    endpoints: { turns: `${baseURL}/widget-fixture/turns`, toolConfirmations: `${baseURL}/widget-fixture/confirmations` },
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
      followUpRequest = route.request().postDataJSON();
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
  const jump = page.getByRole('button', { name: 'Jump to latest message' });
  await expect(jump).toBeInViewport();
  const circle = await jump.boundingBox();
  const icon = await jump.locator('svg').boundingBox();
  const composer = await page.locator('.travel-composer-beam--conversation').boundingBox();
  expect(circle!.width).toBe(44);
  expect(circle!.height).toBe(44);
  expect(Math.abs(circle!.x + 22 - icon!.x - icon!.width / 2)).toBeLessThan(1);
  expect(Math.abs(circle!.y + 22 - icon!.y - icon!.height / 2)).toBeLessThan(1);
  expect(composer!.y - circle!.y - circle!.height).toBe(12);
  await page.screenshot({ path: testInfo.outputPath('jump-to-latest.png') });
  await jump.focus();
  await jump.press('Enter');
  if (reducedMotion === 'no-preference') {
    await expect(jump).toHaveAttribute('data-loading', 'true');
    // Native animation has intermediate positions, not an immediate jump.
    const moving = await page.evaluate(() => ({ y: window.scrollY, end: document.documentElement.scrollHeight - innerHeight }));
    expect(moving.y).toBeLessThan(moving.end - 30);
    // Put the pointer on the owning page, not the nested widget iframe left
    // under the pointer by the earlier submit click.
    await page.mouse.move(5, 5);
    await page.mouse.wheel(0, -120);
    await expect(jump).toHaveAttribute('data-loading', 'false');
    await expect(jump).toBeInViewport();
    await jump.click();
  }
  await expect(jump).toBeHidden();
  await expect(page.getByTestId('conversation-end')).toBeFocused();
  await expect(page.getByText(/Trip planning fixture paragraph 45/)).toBeInViewport();
  expect(turns).toBe(1);
  await host.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await app.getByRole('button', { name: 'Find a stay' }).click();
  await expect.poll(() => turns).toBe(2);
  const sent = page.getByRole('article', { name: 'Traveler message' }).filter({ hasText: 'Find a stay for my selected trip.' });
  await expect(sent).toHaveText('Find a stay for my selected trip.');
  expect(followUpRequest).toMatchObject({ message: 'Find a stay for my selected trip.', modelContext });
  await expect(page.getByText(/Do not repeat the trip review/)).toHaveCount(0);
  await expect(sent).toBeInViewport();
  await expect(jump).toHaveAttribute('data-loading', 'true');
  await expect(jump).toBeEnabled();
  expect(await jump.locator('svg').evaluate(element => getComputedStyle(element).animationName))
    .toBe(reducedMotion === 'reduce' ? 'none' : 'travel-jump-loading');
  await page.screenshot({ path: testInfo.outputPath('follow-up-loading.png') });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 300);
  // Read the older widget while the follow-up is pending. New assistant text
  // must not pull the reader down; the arrow provides the explicit way back.
  // Real scroll input interrupts any remaining smooth follow-up animation;
  // a programmatic scrollIntoViewIfNeeded does not send that reader input.
  await page.mouse.move(5, 5);
  await page.mouse.wheel(0, -120);
  await host.scrollIntoViewIfNeeded();
  await expect(host).toBeInViewport();
  await expect(jump).toBeInViewport();
  const readingPosition = await page.evaluate(() => window.scrollY);
  release();
  await expect(page.getByText('Hotel search fixture complete.')).toBeVisible();
  expect(Math.abs(await page.evaluate(() => window.scrollY) - readingPosition)).toBeLessThan(5);
  await expect(jump).toBeInViewport();
  await expect(jump).toHaveAttribute('data-loading', 'false');
  await jump.click();
  await expect(jump).toBeHidden();
  await expect(page.getByText('Hotel search fixture complete.')).toBeInViewport();
  expect(turns).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
}
