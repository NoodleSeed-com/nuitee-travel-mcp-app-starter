import { expect, test, type Page } from '@playwright/test';

async function headlineLines(page: Page) {
  return page.locator('#travel-home-title').evaluate((heading) => {
    const lines = new Map<number, string[]>();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index ?? 0);
        range.setEnd(node, (match.index ?? 0) + match[0].length);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) continue;
        const top = Math.round(rect.top);
        lines.set(top, [...(lines.get(top) ?? []), match[0]]);
      }
    }

    return [...lines.entries()]
      .sort(([first], [second]) => first - second)
      .map(([, words]) => words);
  });
}

async function expectHeadlineDoesNotOrphanFinalWords(page: Page) {
  const lines = await headlineLines(page);
  const finalLine = lines.at(-1) ?? [];

  expect(finalLine.length).toBeGreaterThanOrEqual(2);
}

async function expectHorizontalFit(page: Page, width: number) {
  await page.setViewportSize({ width, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

test('renders the cinematic guest shell without opening an assistant session', async ({
  page,
}) => {
  const assistantRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/assistant/')) {
      assistantRequests.push(request.url());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', {
    name: 'Tell us where you want to be.',
  })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Skip to content' }))
    .toHaveAttribute('href', '#travel-canvas');
  await expect(page.locator('.travel-hero__image')).toHaveAttribute('alt', '');
  await expect(page.locator('.travel-hero__scrim')).toBeVisible();
  await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
  expect(assistantRequests).toEqual([]);
});

test('uses Inter throughout the consumer and developer UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const consumerFonts = await page.locator('body, h1, button, textarea')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).fontFamily
    )));
  expect(consumerFonts.every((font) => font.includes('Inter Variable'))).toBe(true);

  await page.goto('/developers');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable/);
  await expect(page.locator('code').first()).not.toHaveCSS(
    'font-family',
    /Inter Variable/,
  );
});

test('keeps the cinematic hero legible, fitted, and keyboard-reachable on desktop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');

  await expectHeadlineDoesNotOrphanFinalWords(page);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const [composer, submit] = await Promise.all([
    page.locator('.travel-composer--hero').boundingBox(),
    page.getByRole('button', { name: 'Plan my flight' }).boundingBox(),
  ]);
  for (const bounds of [composer, submit]) {
    expect(bounds).not.toBeNull();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect(bounds?.y).toBeGreaterThanOrEqual(0);
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0))
      .toBeLessThanOrEqual(viewport!.width);
    expect((bounds?.y ?? 0) + (bounds?.height ?? 0))
      .toBeLessThanOrEqual(viewport!.height);
  }

  const heroAppearance = await page.evaluate(() => {
    const heading = getComputedStyle(document.querySelector('h1')!);
    const scrim = getComputedStyle(document.querySelector('.travel-hero__scrim')!);
    return { headingColor: heading.color, scrim: scrim.backgroundImage };
  });
  expect(heroAppearance.headingColor).toBe('rgb(255, 255, 255)');
  expect(heroAppearance.scrim).toContain('linear-gradient');

  const developerLink = page.getByRole('link', { name: 'For developers' });
  let reachedDeveloperLink = false;
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    if (await developerLink.evaluate((element) => document.activeElement === element)) {
      reachedDeveloperLink = true;
      break;
    }
  }
  expect(reachedDeveloperLink).toBe(true);

  const unsupportedUtilities = await page.locator('a, button').evaluateAll((elements) => (
    elements
      .map((element) => element.textContent?.trim() ?? '')
      .filter((label) => /manage booking|check in|flight status/i.test(label))
  ));
  expect(unsupportedUtilities).toEqual([]);
});

test('keeps motion reduced without restoring the retired animation layer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const transitionDurations = await page.locator('.travel-hero, .travel-hero *')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).transitionDuration
    )));
  expect(transitionDurations.every((duration) => duration === '0s')).toBe(true);
  await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
});

test('fits 320px, 390px, and 200 percent text zoom without orphaning the headline', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(page.getByRole('button', { name: 'Plan my flight' }))
    .toHaveCSS('min-height', '44px');
  await expectHeadlineDoesNotOrphanFinalWords(page);

  await expectHorizontalFit(page, 390);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectHorizontalFit(page, 390);
  await expectHeadlineDoesNotOrphanFinalWords(page);
  const composerFits = await page.locator('.travel-composer--hero').evaluate((composer) => {
    const bounds = composer.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth;
  });
  expect(composerFits).toBe(true);
});

test('stacks the trip brief in a ready-runtime mobile conversation without overflow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'deterministic browser fixture' }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask about a flight' })
    .fill('Islamabad to Rome for two, next weekend');
  await page.getByRole('button', { name: 'Plan my flight' }).click();

  await expect(page.getByRole('heading', {
    name: 'Your trip, refined together',
  })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Live trip brief' }))
    .toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  const stacked = await page.evaluate(() => {
    const brief = document.querySelector<HTMLElement>('.trip-brief');
    const conversation = document.querySelector<HTMLElement>('.travel-conversation-shell');
    if (!brief || !conversation) return false;
    return brief.getBoundingClientRect().bottom <= conversation.getBoundingClientRect().top;
  });
  expect(stacked).toBe(true);
});
