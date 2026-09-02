import { expect, test, type Page } from '@playwright/test';

const browserPort = process.env.PLAYWRIGHT_PORT ?? '3108';

function eventFrame(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}`;
}

function selectableFlightAppHtml(selectionId: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 100%; }
      body { padding: 12px; font: 16px/1.4 system-ui, sans-serif; }
      button { min-height: 44px; border: 1px solid #0b2d5c; border-radius: 10px; padding: 10px 16px; background: #0b2d5c; color: white; font: inherit; }
    </style>
  </head>
  <body>
    <main>
      <p>Air Transat · YYZ to LIS · CA$607.45</p>
      <button type="button">Select fare</button>
    </main>
    <script>
      const initializeId = 1;
      addEventListener('message', (event) => {
        if (event.source !== parent || event.data?.id !== initializeId) return;
        parent.postMessage({
          jsonrpc: '2.0',
          method: 'ui/notifications/initialized',
          params: {},
        }, '*');
        parent.postMessage({
          jsonrpc: '2.0',
          method: 'ui/notifications/size-changed',
          params: { height: document.documentElement.scrollHeight },
        }, '*');
      });
      document.querySelector('button').addEventListener('click', () => {
        parent.postMessage({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'select_flight_offer',
            arguments: { selectionId: '${selectionId}' },
          },
        }, '*');
      });
      parent.postMessage({
        jsonrpc: '2.0',
        id: initializeId,
        method: 'ui/initialize',
        params: {
          appInfo: { name: 'Wayfare flight fixture', version: '1.0.0' },
          appCapabilities: {},
          protocolVersion: '2025-11-21',
        },
      }, '*');
    </script>
  </body>
</html>`;
}

async function installImmersiveAssistantFixture(page: Page) {
  const activity = {
    appRequests: [] as Readonly<Record<string, unknown>>[],
    failedRequests: [] as string[],
    sessionRequests: 0,
    turnRequests: 0,
  };
  page.on('requestfailed', (request) => {
    activity.failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown failure'}`,
    );
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'wayfare:experience-prompt',
      'Find me flights from Toronto to Lisbon next week for two.',
    );
  });
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    activity.sessionRequests += 1;
    await route.fulfill({
      body: JSON.stringify({
        endpoints: {
          toolConfirmations: `http://127.0.0.1:${browserPort}/browser-fixture/confirmations`,
          turns: `http://127.0.0.1:${browserPort}/browser-fixture/turns`,
          apps: `http://127.0.0.1:${browserPort}/browser-fixture/apps`,
        },
        expiresAt: '2099-01-01T00:00:00.000Z',
        token: 'browser-fixture-token',
      }),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.route('**/browser-fixture/apps', async (route) => {
    const body = route.request().postDataJSON() as Readonly<Record<string, unknown>>;
    activity.appRequests.push(body);
    await route.fulfill({
      body: JSON.stringify({
        content: [{ type: 'text', text: 'Fare selected.' }],
        isError: false,
        structuredContent: {
          status: 'selected',
          selectionId: 'sel_0123456789abcdef0123456789abcdef',
        },
      }),
      contentType: 'application/json',
      status: 200,
    });
  });
  await page.route('**/browser-fixture/turns', async (route) => {
    activity.turnRequests += 1;
    const selectionId = 'sel_0123456789abcdef0123456789abcdef';
    const searchResult = {
      itineraries: [{
        carrier: { code: 'TS', name: 'Air Transat' },
        departureTime: '2026-09-08T19:45:00-04:00',
        price: { currency: 'CAD', total: 607.45 },
        route: { destination: 'LIS', origin: 'YYZ' },
        selectionId,
      }],
      searchContext: {
        adults: 2,
        cabinClass: 'ECONOMY',
        children: 0,
        country: 'CA',
        currency: 'CAD',
        departureDate: '2026-09-08',
        destination: 'LIS',
        infants: 0,
        origin: 'YYZ',
        tripType: 'ONE_WAY',
      },
      status: 'success',
    };
    await route.fulfill({
      body: [
        eventFrame('content', {
          delta: 'Here are the current options I found for your trip.',
        }),
        eventFrame('tool_completed', {
          id: 'immersive-search',
          tool: 'search_flights',
          result: searchResult,
        }),
        eventFrame('view_available', {
          id: 'immersive-flight-view',
          tool: 'search_flights',
          resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
          title: 'Flight results',
          result: searchResult,
          html: selectableFlightAppHtml(selectionId),
        }),
        eventFrame('done', {}),
        '',
      ].join('\n\n'),
      contentType: 'text/event-stream',
      status: 200,
    });
  });
  return activity;
}

test('renders the full-bleed Explore alternative without changing the current home route', async ({
  page,
}) => {
  await page.goto('/experience');

  const experience = page.getByTestId('immersive-explore-page');
  await expect(experience).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plan your whole trip' }))
    .toBeVisible();
  await expect(page.getByRole('form', { name: 'Plan with Explore' })).toBeVisible();
  await expect(page.getByTestId('immersive-destination-preview')).toHaveCount(3);

  const modes = page.getByRole('tablist', { name: 'Choose a planning view' });
  await expect(modes.getByRole('tab')).toHaveCount(5);
  await modes.getByRole('tab', { name: 'Insurance' }).click();
  await expect(page.getByRole('heading', { name: 'Compare with confidence' }))
    .toBeVisible();
  await expect(page.locator('section[data-mode="insurance"] img'))
    .toHaveAttribute('src', /wayfare-insurance-v1/);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    pageWidth: document.querySelector<HTMLElement>('[data-testid="immersive-explore-page"]')
      ?.getBoundingClientRect().width,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  expect(dimensions.pageWidth).toBe(dimensions.clientWidth);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Plan your whole trip' }))
    .toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Choose a planning view' }))
    .toBeVisible();
});

test('keeps the alternative custom chat empty state useful and bounded', async ({ page }) => {
  await page.goto('/experience/chat');

  await expect(page.getByTestId('immersive-chat-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where should we take you?' }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Find a flight' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare stays' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review rewards' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
});

test('uses the compact mobile chat treatment with reachable 44px controls', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile layout evidence');
  await page.goto('/experience/chat');

  const menu = page.getByRole('button', { name: 'Open menu' });
  const flight = page.getByRole('button', { name: 'Find a flight' });
  await expect(menu).toBeVisible();
  await expect(flight).toBeVisible();

  const controls = await Promise.all([
    menu.boundingBox(),
    flight.boundingBox(),
    page.getByRole('textbox', { name: 'Ask the travel assistant' }).boundingBox(),
  ]);
  for (const control of controls) {
    expect(control?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Trip navigation' }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Close menu' }))
    .toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Trip navigation' }))
    .toBeHidden();

  await page.goto('/experience');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', {
    name: 'Alternative experience navigation',
  })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Currency' }).last())
    .toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
});

test('projects a fare selected inside the embedded App into the immersive desktop workspace', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop layout evidence');
  const activity = await installImmersiveAssistantFixture(page);
  await page.goto('/experience/chat');

  await expect.poll(() => activity.sessionRequests).toBe(1);
  await expect.poll(() => activity.turnRequests, {
    message: JSON.stringify(activity),
  }).toBe(1);
  expect(activity.failedRequests).toEqual([]);

  const conversation = page.getByRole('region', { name: 'Travel conversation' });
  const trip = page.getByRole('complementary', { name: 'Your trip' });
  await expect(conversation).toBeVisible();
  await expect(page.getByRole('region', { name: 'Trip route summary' }))
    .toContainText('YYZ → LIS');
  await expect(page.getByLabel('Wayfare assistant')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Traveler' })).toBeVisible();
  const appHost = conversation.locator('noodle-app-view').first();
  const appProxyDocument = appHost.locator('iframe').first().contentFrame();
  const appDocument = appProxyDocument.locator('iframe').contentFrame();
  await appDocument.getByRole('button', { name: 'Select fare' }).click();
  await expect.poll(() => activity.appRequests.length).toBe(1);
  expect(activity.appRequests[0]).toMatchObject({
    method: 'tools/call',
    params: {
      name: 'select_flight_offer',
      arguments: { selectionId: 'sel_0123456789abcdef0123456789abcdef' },
    },
  });
  await expect(trip.getByRole('button', { name: /Flight/ }))
    .toContainText('Air Transat · YYZ → LIS');
  await expect(trip.getByRole('button', { name: /Flight/ }))
    .toContainText('Nuitee search fare · CA$607.45 · 19:45 · Verify price');
  await expect.poll(() => page.evaluate(() => (
    window.sessionStorage.getItem('wayfare:experience-prompt')
  ))).toBeNull();

  const [conversationBounds, transcriptBounds, tripBounds] = await Promise.all([
    conversation.boundingBox(),
    conversation.getByRole('log', { name: 'Conversation transcript' }).locator('..').boundingBox(),
    trip.boundingBox(),
  ]);
  expect(conversationBounds?.width ?? 0).toBeGreaterThan(1_100);
  expect(transcriptBounds?.x ?? 0).toBeLessThan(tripBounds?.x ?? 0);
  expect((transcriptBounds?.x ?? 0) + (transcriptBounds?.width ?? 0))
    .toBeLessThanOrEqual((tripBounds?.x ?? 0) + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('immersive-selected-flight-desktop.png'),
  });
});

test('keeps an App-selected trip item reachable in the immersive mobile view', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile layout evidence');
  const activity = await installImmersiveAssistantFixture(page);
  await page.goto('/experience/chat');

  await expect.poll(() => activity.sessionRequests).toBe(1);
  await expect.poll(() => activity.turnRequests, {
    message: JSON.stringify(activity),
  }).toBe(1);
  expect(activity.failedRequests).toEqual([]);

  const appHost = page.getByRole('region', { name: 'Travel conversation' })
    .locator('noodle-app-view').first();
  const appProxyDocument = appHost.locator('iframe').first().contentFrame();
  const appDocument = appProxyDocument.locator('iframe').contentFrame();
  await appDocument.getByRole('button', { name: 'Select fare' }).click();
  await expect.poll(() => activity.appRequests.length).toBe(1);

  const tripToggle = page.getByRole('button', { name: 'View trip · 1 selected' });
  await expect(tripToggle).toBeVisible();
  await expect(tripToggle).toHaveAttribute('aria-expanded', 'false');
  await tripToggle.click();
  await expect(tripToggle).toHaveAttribute('aria-expanded', 'true');
  const flightTripItem = page.locator('#immersive-trip-panel > button').first();
  await expect(flightTripItem).toContainText('Air Transat · YYZ → LIS');
  await flightTripItem.evaluate((button) => {
    const labels = button.querySelectorAll(':scope > span:nth-child(2) > strong, :scope > span:nth-child(2) > small');
    if (labels.length === 0) throw new Error('Trip item labels are missing');
    for (const label of labels) {
      label.textContent = 'An intentionally exceptionally long international trip description';
    }
  });

  const composer = page.getByRole('form', { name: 'Continue trip' });
  const composerBounds = await composer.boundingBox();
  expect(composerBounds?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(composerBounds?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((composerBounds?.x ?? 0) + (composerBounds?.width ?? 0))
    .toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
  const [tripItemBounds, tripTextBounds] = await Promise.all([
    flightTripItem.boundingBox(),
    flightTripItem.locator('span').nth(1).boundingBox(),
  ]);
  expect((tripTextBounds?.x ?? 0) + (tripTextBounds?.width ?? 0))
    .toBeLessThanOrEqual((tripItemBounds?.x ?? 0) + (tripItemBounds?.width ?? 0));
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('immersive-selected-flight-mobile.png'),
  });
});

test('keeps the immersive workspace horizontally contained at the tablet seam', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Tablet layout evidence');
  await page.setViewportSize({ width: 820, height: 900 });
  const activity = await installImmersiveAssistantFixture(page);
  await page.goto('/experience/chat');
  await expect.poll(() => activity.turnRequests).toBe(1);

  const responsiveLayout = await page.getByRole('region', {
    name: 'Travel conversation',
  }).evaluate((conversation) => {
    const rail = conversation.querySelector<HTMLElement>('[aria-label="Your trip"]');
    return {
      columns: getComputedStyle(conversation).gridTemplateColumns.split(' ').length,
      railPosition: rail ? getComputedStyle(rail).position : undefined,
    };
  });
  expect(responsiveLayout).toEqual({ columns: 1, railPosition: 'static' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(await page.evaluate(() => document.documentElement.clientWidth));
  await expect(page.getByRole('region', { name: 'Trip route summary' }))
    .toBeVisible();
});

test('disables decorative animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/experience');

  const animationName = await page.locator('[class*="imageSkeleton"]')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe('none');
});
