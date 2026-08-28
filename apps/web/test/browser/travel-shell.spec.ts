import { expect, test, type Page } from '@playwright/test';
import { starterConfig } from '../../../../starter.config';

async function renderedTextLines(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const lines = new Map<number, string[]>();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
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
  const lines = await renderedTextLines(page, '#travel-home-title');
  const finalLine = lines.at(-1) ?? [];

  expect(finalLine.length).toBeGreaterThanOrEqual(2);
}

async function expectHorizontalFit(page: Page, width: number) {
  await page.setViewportSize({ width, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

async function expectMinimumTargetSize(
  locator: ReturnType<Page['locator']>,
) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
}

async function expectStarterPromptsFit(page: Page, width: number) {
  const promptList = page.getByRole('list', { name: 'Suggested trips' });
  await expect(promptList).toBeVisible();

  for (const prompt of starterConfig.prompts.slice(0, 2)) {
    const button = promptList.getByRole('button', { name: prompt });
    await expect(button).toBeVisible();
    await expectMinimumTargetSize(button);
    const fit = await button.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        contentFits: element.scrollWidth <= element.clientWidth
          && element.scrollHeight <= element.clientHeight,
        left: bounds.left,
        right: bounds.right,
      };
    });
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeLessThanOrEqual(width);
    expect(fit.contentFits).toBe(true);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

async function landingMidwordBreaks(page: Page) {
  return page.locator('.travel-landing, .travel-footer').evaluateAll((roots) => {
    const breaks: Array<{ text: string; word: string }> = [];

    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const text = node.textContent ?? '';
        for (const match of text.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          const lineTops = new Set(
            Array.from(range.getClientRects())
              .filter((rect) => rect.width > 0 && rect.height > 0)
              .map((rect) => Math.round(rect.top * 10) / 10),
          );
          if (lineTops.size > 1) {
            breaks.push({
              text: node.parentElement?.textContent?.trim() ?? text.trim(),
              word: match[0],
            });
          }
        }
      }
    }

    return breaks;
  });
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
    level: 1,
    name: 'Where will you go next?',
  })).toBeVisible();
  await expect(page.getByRole('heading', {
    level: 2,
    name: 'Places to start',
  })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText(
    'Built on Noodle Seed · Powered by Nuitee',
  );
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

  await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable/);
  const consumerFonts = await page.locator(
    '.travel-workspace, .travel-workspace h1, .travel-workspace button, .travel-workspace textarea',
  )
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
    page.getByRole('button', { name: 'Find flights' }).boundingBox(),
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

  const developerLink = page.getByRole('navigation', {
    name: 'Primary navigation',
  }).getByRole('link', { name: 'For developers' });
  let reachedDeveloperLink = false;
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    if (await developerLink.evaluate((element) => document.activeElement === element)) {
      reachedDeveloperLink = true;
      break;
    }
  }
  expect(reachedDeveloperLink).toBe(true);

  const menuTrigger = page.getByRole('button', { name: 'Open menu' });
  await menuTrigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Travel menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused();
  const menuTargets = menu.locator('a, button');
  const lastMenuTarget = menuTargets.last();
  await page.keyboard.press('Shift+Tab');
  await expect(lastMenuTarget).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(menuTrigger).toBeFocused();

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
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menuDurations = await page.getByRole('dialog', { name: 'Travel menu' })
    .locator(':scope, :scope *')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).transitionDuration
    )));
  expect(menuDurations.every((duration) => duration === '0s')).toBe(true);
  await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
});

test('keeps the next section discoverable with desktop targets at least 44px', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const destinationTop = await page.locator('#places-to-start').evaluate((section) => (
    section.getBoundingClientRect().top
  ));
  expect(destinationTop).toBeGreaterThan(0);
  expect(destinationTop).toBeLessThanOrEqual(1120);

  const targets = [
    page.getByRole('button', { name: 'Open menu' }),
    page.getByRole('button', { name: 'Find flights' }),
    ...await page.locator('.destination-card').all(),
    page.getByRole('button', { name: 'Start with a flexible trip' }),
    ...await page.getByRole('contentinfo').getByRole('link').all(),
  ];
  for (const target of targets) await expectMinimumTargetSize(target);
});

test('uses three, two-plus-span, and one destination columns by breakpoint', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  let boxes = await page.locator('.destination-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  }));
  expect(boxes).toHaveLength(3);
  expect(boxes.map(({ top }) => top)).toEqual([boxes[0]!.top, boxes[0]!.top, boxes[0]!.top]);
  expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left);
  expect(boxes[1]!.right).toBeLessThanOrEqual(boxes[2]!.left);

  await page.setViewportSize({ width: 768, height: 1024 });
  boxes = await page.locator('.destination-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  }));
  expect(boxes[0]!.top).toBe(boxes[1]!.top);
  expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left);
  expect(boxes[2]!.top).toBeGreaterThanOrEqual(boxes[0]!.bottom);
  expect(boxes[2]!.left).toBe(boxes[0]!.left);
  expect(boxes[2]!.right).toBe(boxes[1]!.right);

  await page.setViewportSize({ width: 390, height: 844 });
  boxes = await page.locator('.destination-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  }));
  expect(boxes[0]!.bottom).toBeLessThanOrEqual(boxes[1]!.top);
  expect(boxes[1]!.bottom).toBeLessThanOrEqual(boxes[2]!.top);
});

test('fits the landing document at every required viewport width', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');

  for (const width of [320, 390, 768, 1440]) {
    await expectHorizontalFit(page, width);
  }
});

test('starts one destination prompt through one assistant turn', async ({ page }) => {
  const submittedPrompts: string[] = [];
  let sessionRequests = 0;
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    sessionRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'browser-fixture-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        endpoints: {
          turns: 'http://127.0.0.1:3108/browser-fixture/turns',
          toolConfirmations: 'http://127.0.0.1:3108/browser-fixture/confirmations',
        },
      }),
    });
  });
  await page.route('**/browser-fixture/turns', async (route) => {
    const body = route.request().postDataJSON() as { message?: unknown };
    if (typeof body.message === 'string') submittedPrompts.push(body.message);
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'deterministic_browser_fixture' }),
    });
  });

  await page.goto('/');
  expect(sessionRequests).toBe(0);
  expect(submittedPrompts).toEqual([]);
  await page.getByRole('button', { name: 'Plan a trip to Rome' }).click();

  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Your trip, refined together',
  })).toBeVisible();
  await expect.poll(() => submittedPrompts).toEqual([
    'Help me plan a long-weekend flight to Rome for two.',
  ]);
  expect(sessionRequests).toBe(1);
});

test('keeps the developer route static, legal-safe, and set in Inter', async ({ page }) => {
  const assistantRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/assistant/')) assistantRequests.push(request.url());
  });
  await page.goto('/developers');
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('heading', { level: 1, name: 'Guest-first setup' }))
    .toBeVisible();
  await expect(page.getByText(/Search → Select → Verify/)).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family', /Inter Variable/);
  await expect(page.getByRole('link', { name: 'Support' }))
    .toHaveAttribute('href', '/developers#support');
  await expect(page.getByRole('link', { name: 'Privacy' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveCount(0);
  expect(assistantRequests).toEqual([]);
});

test('fits 320px, 390px, and 200 percent text zoom without orphaning the headline', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(page.getByRole('button', { name: 'Find flights' }))
    .toHaveCSS('min-height', '44px');
  const [mobileInput, mobileSubmit] = await Promise.all([
    page.getByRole('textbox', { name: 'Ask about a flight' }).boundingBox(),
    page.getByRole('button', { name: 'Find flights' }).boundingBox(),
  ]);
  expect(mobileInput).not.toBeNull();
  expect(mobileSubmit).not.toBeNull();
  expect(mobileInput!.y + mobileInput!.height)
    .toBeLessThanOrEqual(mobileSubmit!.y);
  expect(await page.getByRole('textbox', { name: 'Ask about a flight' })
    .evaluate((input) => input.scrollHeight <= input.clientHeight)).toBe(true);
  await expectHeadlineDoesNotOrphanFinalWords(page);

  await expectHorizontalFit(page, 390);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectHorizontalFit(page, 390);
  await expectHeadlineDoesNotOrphanFinalWords(page);
  expect(await landingMidwordBreaks(page)).toEqual([]);
  const editorialLines = await renderedTextLines(
    page,
    '.travel-editorial__copy h2',
  );
  expect(editorialLines.at(-1)?.length).toBeGreaterThanOrEqual(2);
  const composerFits = await page.locator('.travel-composer--hero').evaluate((composer) => {
    const bounds = composer.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth;
  });
  expect(composerFits).toBe(true);
  const submitContentsFit = await page.getByRole('button', { name: 'Find flights' })
    .evaluate((button) => {
      const bounds = button.getBoundingClientRect();
      return Array.from(button.children).every((child) => {
        const childBounds = child.getBoundingClientRect();
        return childBounds.left >= bounds.left
          && childBounds.right <= bounds.right
          && childBounds.top >= bounds.top
          && childBounds.bottom <= bounds.bottom;
      });
    });
  expect(submitContentsFit).toBe(true);
  expect(await page.getByRole('textbox', { name: 'Ask about a flight' })
    .evaluate((input) => input.scrollHeight <= input.clientHeight)).toBe(true);
  for (const target of [
    page.getByRole('button', { name: 'Open menu' }),
    page.getByRole('button', { name: 'Find flights' }),
    page.getByRole('button', { name: 'Plan a trip to Rome' }),
    page.getByRole('button', { name: 'Start with a flexible trip' }),
    page.getByRole('contentinfo').getByRole('link', { name: 'Support' }),
  ]) {
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await expectMinimumTargetSize(target);
  }
});

test('shows both configured starter prompts across required mobile conditions', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await expectStarterPromptsFit(page, 320);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectStarterPromptsFit(page, 390);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectStarterPromptsFit(page, 390);
});

test('uses a full-width mobile navigation sheet at 320px without overflow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();

  const dialog = page.getByRole('dialog', { name: 'Travel menu' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBe(0);
  expect(bounds!.width).toBe(320);
  expect(bounds!.x + bounds!.width).toBe(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('stacks every below-fold landing section at 390px', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const destinationCards = page.locator('.destination-card');
  await expect(destinationCards).toHaveCount(3);
  const destinationBoxes = await destinationCards.evaluateAll((cards) => (
    cards.map((card) => {
      const bounds = card.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    })
  ));
  for (const [index, bounds] of destinationBoxes.entries()) {
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(390);
    expect(bounds.width).toBe(destinationBoxes[0]?.width);
    if (index > 0) {
      expect(destinationBoxes[index - 1]!.bottom)
        .toBeLessThanOrEqual(bounds.top);
    }
  }

  const capabilityItems = page.getByRole('list', {
    name: 'How the travel assistant works',
  }).locator(':scope > li');
  await expect(capabilityItems).toHaveCount(3);
  const capabilityBoxes = await capabilityItems.evaluateAll((items) => (
    items.map((item) => {
      const bounds = item.getBoundingClientRect();
      return { bottom: bounds.bottom, top: bounds.top };
    })
  ));
  for (let index = 1; index < capabilityBoxes.length; index += 1) {
    expect(capabilityBoxes[index - 1]!.bottom)
      .toBeLessThanOrEqual(capabilityBoxes[index]!.top);
  }

  const [editorialImage, editorialCopy] = await Promise.all([
    page.locator('.travel-editorial__image').boundingBox(),
    page.locator('.travel-editorial__copy').boundingBox(),
  ]);
  expect(editorialImage).not.toBeNull();
  expect(editorialCopy).not.toBeNull();
  expect(editorialImage!.y + editorialImage!.height)
    .toBeLessThanOrEqual(editorialCopy!.y);
  for (const bounds of [editorialImage!, editorialCopy!]) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }

  const footer = page.locator('.travel-footer');
  const footerBounds = await footer.boundingBox();
  expect(footerBounds).not.toBeNull();
  expect(footerBounds!.x).toBeGreaterThanOrEqual(0);
  expect(footerBounds!.x + footerBounds!.width).toBeLessThanOrEqual(390);
  await expect(footer.getByText('Privacy').locator('..'))
    .toContainText('Not configured');
  await expect(footer.getByText('Terms').locator('..'))
    .toContainText('Not configured');
  for (const link of await footer.getByRole('link').all()) {
    await expect(link).toHaveCSS('min-height', '44px');
    const bounds = await link.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
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
  await page.getByRole('button', { name: 'Find flights' }).click();

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
