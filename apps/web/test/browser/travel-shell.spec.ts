import { access, readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const browserTestPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '3108', 10);
const browserTestOrigin = `http://localhost:${browserTestPort}`;

function renderedContrastRatio(
  foreground: string,
  background: string,
): number {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) {
      throw new Error(`Expected rendered RGB color, received ${color}`);
    }
    const [red, green, blue] = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
  };
  const values = [luminance(foreground), luminance(background)]
    .sort((first, second) => second - first);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

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

async function expectDestinationWindowsSettled(page: Page) {
  const section = page.locator('#places-to-start');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-revealed', 'true');
  await expect.poll(() => section.locator('.destination-inspiration__grid > li')
    .evaluateAll((items) => items.every((item) => {
      const style = getComputedStyle(item);
      return style.opacity === '1' && style.transform === 'none';
    }))).toBe(true);
}

async function expectMinimumTargetSize(
  locator: ReturnType<Page['locator']>,
) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
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

test('renders one agent-led start without opening an assistant session', async ({
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
    name: 'Tell us the trip you have in mind',
  })).toBeVisible();
  await expect(page.getByText('Your journey starts here')).toHaveCount(0);
  await expect(page.getByText(/Describe the journey once/)).toHaveCount(0);
  await expect(page.getByText(/For example:/)).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Plan a trip' })).toHaveCount(1);
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.locator('.travel-starter-prompts')).toHaveCount(0);
  const capabilities = page.getByRole('region', { name: 'Wayfare capabilities' });
  await expect(capabilities).toBeVisible();
  await expect(capabilities.getByRole('listitem')).toHaveCount(6);
  await expect(capabilities.getByText(
    'Search and compare one-way or return fares.',
  )).toBeVisible();
  await expect(capabilities.getByText(
    'Review, confirm, change, or cancel conversationally.',
  )).toBeVisible();
  await expect(capabilities.getByRole('button')).toHaveCount(0);
  await expect(capabilities.getByRole('link')).toHaveCount(0);
  const liquidIcons = capabilities.locator('[data-wayfare-liquid-icon="true"]');
  await expect(liquidIcons).toHaveCount(6);
  await expect(liquidIcons.first()).toHaveAttribute('data-renderer', 'webgl');
  const capabilityTones = await capabilities.evaluate((element) => ({
    description: getComputedStyle(
      element.querySelector('.travel-capabilities__copy p')!,
    ).color,
    note: getComputedStyle(
      element.querySelector('.travel-capabilities__note')!,
    ).color,
    title: getComputedStyle(
      element.querySelector('.travel-capabilities__copy strong')!,
    ).color,
  }));
  expect(capabilityTones).toEqual({
    description: 'rgb(118, 118, 118)',
    note: 'rgb(118, 118, 118)',
    title: 'rgb(13, 13, 13)',
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const capabilityNoteLines = await capabilities.locator(
    '.travel-capabilities__note',
  ).evaluate((element) => {
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    return element.getBoundingClientRect().height / lineHeight;
  });
  expect(capabilityNoteLines).toBeLessThan(1.2);
  await expect(page.locator('.destination-card')).toHaveCount(5);
  await expect(page.locator('.destination-card button')).toHaveCount(0);
  await expect(page.locator('.travel-editorial button')).toHaveCount(0);
  await expect(page.locator('main h1')).toHaveCount(1);
  const partners = page.getByRole('complementary', { name: 'Technology partners' });
  await expect(partners).toBeVisible();
  await expect(partners.getByRole('img', { name: 'Noodle Seed' })).toBeVisible();
  await expect(partners.getByRole('img', { name: 'Nuitée' })).toBeVisible();
  const partnerGeometry = await partners.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    noodleHeight: element.querySelector<HTMLImageElement>('img[alt="Noodle Seed"]')
      ?.getBoundingClientRect().height ?? 0,
    nuiteeHeight: element.querySelector<HTMLImageElement>('img[alt="Nuitée"]')
      ?.getBoundingClientRect().height ?? 0,
  }));
  expect(partnerGeometry.height).toBeGreaterThanOrEqual(72);
  expect(partnerGeometry.noodleHeight).toBeGreaterThanOrEqual(20);
  expect(partnerGeometry.nuiteeHeight).toBeGreaterThanOrEqual(24);
  expect(assistantRequests).toEqual([]);
});

test('adapts the passive capability grid without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');

  for (const [width, expectedColumns] of [
    [1280, 3],
    [820, 2],
    [390, 1],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });

    const layout = await page.locator('.travel-capabilities__grid').evaluate(
      (element) => ({
        columns: getComputedStyle(element).gridTemplateColumns
          .split(' ')
          .filter(Boolean).length,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }),
    );

    expect(layout.columns).toBe(expectedColumns);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  }
});

test('renders a branded flag-rich currency selector at every viewport', async ({
  page,
}) => {
  await page.goto('/');

  const control = page.locator('.travel-header__currency-control');
  const currency = page.getByRole('combobox', { name: 'Currency' });
  const flag = control.locator('.travel-header__currency-flag');
  const chevron = control.locator('.travel-header__currency-chevron');

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 720 });

    const geometry = await control.evaluate((element) => {
      const select = element.querySelector('[role="combobox"]');
      const flagElement = element.querySelector('.travel-header__currency-flag');
      const chevronElement = element.querySelector('.travel-header__currency-chevron');
      if (!select || !flagElement || !chevronElement) {
        throw new Error('Expected the complete currency control');
      }

      const controlBounds = element.getBoundingClientRect();
      const selectBounds = select.getBoundingClientRect();
      const flagBounds = flagElement.getBoundingClientRect();
      const chevronBounds = chevronElement.getBoundingClientRect();

      return {
        controlHeight: controlBounds.height,
        flagHeight: flagBounds.height,
        flagInset: flagBounds.left - controlBounds.left,
        flagWidth: flagBounds.width,
        selectHeight: selectBounds.height,
        chevronInset: controlBounds.right - chevronBounds.right,
        verticalCenterDifference: Math.abs(
          (flagBounds.top + (flagBounds.height / 2))
          - (chevronBounds.top + (chevronBounds.height / 2)),
        ),
      };
    });

    expect(geometry.controlHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.selectHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.flagWidth).toBeGreaterThanOrEqual(16);
    expect(geometry.flagHeight).toBeGreaterThanOrEqual(10);
    expect(geometry.flagInset).toBeGreaterThanOrEqual(10);
    expect(geometry.chevronInset).toBeGreaterThanOrEqual(10);
    expect(geometry.verticalCenterDifference).toBeLessThanOrEqual(1);
  }

  await expect(currency).toHaveAttribute('data-value', 'USD');
  await expect(flag).toHaveAttribute('data-currency-flag', 'US');
  await expect(flag.locator('svg')).toHaveCount(1);
  await currency.click();
  const listbox = page.getByRole('listbox', { name: 'Currency' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option')).toHaveCount(13);
  await expect(listbox.locator('[data-currency-option-flag] svg')).toHaveCount(13);
  await expect(listbox.getByRole('option', {
    name: 'USD United States',
  })).toHaveAttribute('aria-selected', 'true');
  await expect(listbox.locator('[data-selected-check]')).toHaveCount(1);
  const listboxBounds = await listbox.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
  expect(listboxBounds.left).toBeGreaterThanOrEqual(0);
  expect(listboxBounds.right).toBeLessThanOrEqual(listboxBounds.viewportWidth);
});

test('uses a granted browser location for the visible origin and currency defaults', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['geolocation'], {
    origin: browserTestOrigin,
  });
  await context.setGeolocation({ latitude: 33.6167, longitude: 73.0992 });

  await page.goto('/');

  await expect(page.getByRole('combobox', { name: 'Currency' }))
    .toHaveAttribute('data-value', 'PKR');
  await expect(page.getByRole('textbox', { name: 'Ask the travel assistant' }))
    .not.toHaveAttribute('placeholder');
  await expect(page.locator('[data-typewriter-prompts]'))
    .toHaveAttribute('data-typewriter-prompts', /Islamabad to Tokyo next spring/);
});

test('keeps neutral travel defaults when browser location is denied', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) {
          error?.({
            code: 1,
            message: 'Permission denied',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
      },
    });
  });

  await page.goto('/');

  await expect(page.getByRole('combobox', { name: 'Currency' }))
    .toHaveAttribute('data-value', 'USD');
  await expect(page.getByRole('textbox', { name: 'Ask the travel assistant' }))
    .not.toHaveAttribute('placeholder');
  await expect(page.locator('[data-typewriter-prompts]'))
    .toHaveAttribute('data-typewriter-prompts', /Tokyo in spring/);
});

test('keeps the agent-led hero centered with rounded visual surfaces', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const selector of [
    '#travel-home-title',
    '.travel-composer--hero',
  ]) {
    const bounds = await page.locator(selector).boundingBox();
    expect(bounds).not.toBeNull();
    const center = bounds!.x + (bounds!.width / 2);
    expect(Math.abs(center - (viewport!.width / 2))).toBeLessThanOrEqual(2);
  }

  await expect(page.getByRole('link', { name: 'Wayfare', exact: true })).toBeVisible();
  const headlineLayout = await page.locator('#travel-home-title').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
  if (testInfo.project.name === 'desktop-chromium') {
    expect(headlineLayout.height).toBeLessThanOrEqual(headlineLayout.lineHeight * 1.2);
  } else {
    expect(headlineLayout.height).toBeGreaterThan(headlineLayout.lineHeight * 1.5);
  }
  await expect(page.locator('#travel-home-title')).toHaveCSS('font-weight', '500');
  await expect(page.locator('.travel-hero__view')).toHaveAttribute(
    'src',
    /wayfare-window-view-v1/,
  );
  await expect(page.locator('.travel-hero__cabin')).toHaveAttribute(
    'src',
    /wayfare-cabin-frame-v1/,
  );

  for (const selector of [
    '.travel-composer--hero',
    '.destination-card',
    '.travel-editorial',
  ]) {
    const radius = await page.locator(selector).first().evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
    ));
    expect(radius).toBeGreaterThanOrEqual(20);
  }
  await expect(page.locator('.travel-editorial img')).toHaveCount(0);
  await expect(page.locator(
    '.travel-editorial [data-wayfare-mark="true"]',
  )).toBeVisible();
});

test('keeps the hero frame thirty percent shorter at the reviewed viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1009, height: 1024 });
  await page.goto('/');

  const hero = await page.locator('.travel-hero__experience').boundingBox();
  expect(hero).not.toBeNull();
  expect(hero!.height).toBeGreaterThanOrEqual(465);
  expect(hero!.height).toBeLessThanOrEqual(475);
  await expect(page.locator('.travel-composer--hero')).toBeVisible();
});

test('shows the hero photography without a full-frame tint', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.travel-hero__media-veil')).toHaveCount(0);
  await expect(page.locator('.travel-hero__view')).toHaveCSS('filter', 'none');
  await expect(page.locator('.travel-hero__copy')).toHaveCSS('text-shadow', 'none');
  await expect(page.locator('.travel-hero__experience')).toHaveCSS('border-width', '0px');
  await expect(page.locator('.travel-hero__experience')).toHaveCSS('box-shadow', 'none');
});

test('moves only the outside view when a pointer looks around the windows', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const hero = page.locator('.travel-hero__experience');
  const view = page.locator('.travel-hero__view');
  const cabin = page.locator('.travel-hero__cabin');
  await expect(view).toBeVisible();
  await expect(cabin).toBeVisible();
  const bounds = await hero.boundingBox();
  expect(bounds).not.toBeNull();
  const initialViewTransform = await view.evaluate((element) => (
    getComputedStyle(element).transform
  ));
  const initialCabinTransform = await cabin.evaluate((element) => (
    getComputedStyle(element).transform
  ));

  await page.mouse.move(
    bounds!.x + bounds!.width - 40,
    bounds!.y + (bounds!.height / 2),
  );
  await expect.poll(() => view.evaluate((element) => (
    getComputedStyle(element).transform
  ))).not.toBe(initialViewTransform);
  await expect(cabin).toHaveCSS('transform', initialCabinTransform);

  await page.mouse.move(0, 0);
  await expect.poll(() => view.evaluate((element) => (
    getComputedStyle(element).transform
  ))).toBe(initialViewTransform);
});

test('keeps the layered hero static when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const hero = page.locator('.travel-hero__experience');
  const view = page.locator('.travel-hero__view');
  const bounds = await hero.boundingBox();
  expect(bounds).not.toBeNull();
  const initialTransform = await view.evaluate((element) => (
    getComputedStyle(element).transform
  ));
  await page.mouse.move(
    bounds!.x + bounds!.width - 40,
    bounds!.y + (bounds!.height / 2),
  );
  await expect(view).toHaveCSS('transform', initialTransform);
});

test('renders the exact Wayline and state-bound composer beam', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.goto('/');

  const mark = page.locator('[data-wayfare-mark="true"]').first();
  await expect(mark).toHaveAttribute('viewBox', '0 0 64 64');
  await expect(mark.locator('path')).toHaveAttribute(
    'd',
    'M7 18C14 18 15.5 46 24 46C32.5 46 31 22 39 22C47 22 46 42 53 42C57.5 42 58.5 35.5 59 30',
  );
  await expect(mark.locator('circle')).toHaveCount(2);

  const wrapper = page.locator('[data-wayfare-composer-beam="true"]');
  const beam = wrapper.locator('[data-beam]');
  const input = page.getByRole('textbox', { name: 'Ask the travel assistant' });
  await expect(page.locator('.travel-workspace')).toHaveAttribute('data-app-ready', 'true');
  await expect(input).toBeEditable();
  await expect(wrapper).toHaveAttribute('data-composer-state', 'idle');
  await expect(beam).not.toHaveAttribute('data-active', '');
  const beamStyles = await wrapper.locator('style').textContent();
  expect(beamStyles).toContain('rgb(80, 60, 200)');
  expect(beamStyles).not.toContain('rgb(255, 50, 100)');
  await input.focus();
  await expect(beam).not.toHaveAttribute('data-active', '');
  await input.fill('Tokyo in spring');
  await expect(wrapper).toHaveAttribute('data-composer-state', 'focused');
  await expect(beam).not.toHaveAttribute('data-active', '');
  await expect(input).toHaveCSS('box-shadow', 'none');
  await expect(wrapper.locator('.travel-composer')).toHaveCSS(
    'border-color',
    'rgb(13, 13, 13)',
  );
  const focusedComposerStyle = await wrapper.locator('.travel-composer')
    .evaluate((element) => ({
      borderColor: getComputedStyle(element).borderColor,
      boxShadow: getComputedStyle(element).boxShadow,
    }));
  expect(focusedComposerStyle.borderColor).toBe('rgb(13, 13, 13)');
  expect(focusedComposerStyle.boxShadow).toContain('rgb(13, 13, 13)');
  expect(focusedComposerStyle.boxShadow).not.toContain('rgb(102, 204, 255)');
  const focusedComposer = await wrapper.locator('.travel-composer').evaluate((element) => ({
    radius: Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
  }));
  expect(focusedComposer.radius).toBeGreaterThanOrEqual(100);
  await input.blur();
  await expect(wrapper).toHaveAttribute('data-composer-state', 'idle');
  await input.fill('');
  await input.blur();
  await expect(beam).not.toHaveAttribute('data-active', '');

  const submit = page.getByRole('button', { name: 'Submit trip request' });
  await expect(submit).not.toContainText('Plan my trip');
  await expect(submit.locator('svg')).toHaveCount(1);

  const liquidMark = page.locator('[data-wayfare-liquid="true"]');
  await liquidMark.scrollIntoViewIfNeeded();
  await expect(liquidMark).toHaveAttribute('data-renderer', 'webgl');
  const liquidCanvas = liquidMark.locator('canvas');
  await expect(liquidCanvas).toBeVisible();
  await expect(liquidCanvas).toHaveCSS(
    'mask-image',
    /wayfare-mark-mask\.svg/u,
  );
  const firstLiquidFrame = await liquidMark.screenshot();
  await page.waitForTimeout(700);
  const secondLiquidFrame = await liquidMark.screenshot();
  expect(secondLiquidFrame.equals(firstLiquidFrame)).toBe(false);
  const editorialMark = liquidMark.locator('[data-wayfare-mark="true"]');
  await expect(editorialMark).toHaveAttribute('data-wayfare-gradient', 'static');
  await expect(editorialMark.locator('path')).toHaveAttribute('stroke', /^url\(#.+\)$/u);
  const stopAnimations = await editorialMark.locator('stop').evaluateAll((stops) => (
    stops.map((stop) => getComputedStyle(stop).animationName)
  ));
  expect(stopAnimations.every((name) => name === 'none')).toBe(true);
});

test('keeps the exact light Wayfare tokens under every system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const light = await page.locator('html').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      actionNeeded: style.getPropertyValue('--travel-action-needed').trim(),
      background: getComputedStyle(document.body).backgroundColor,
      confirmed: style.getPropertyValue('--travel-confirmed').trim(),
      ink: style.getPropertyValue('--travel-ink').trim(),
      selected: style.getPropertyValue('--travel-selected').trim(),
    };
  });
  expect(light).toEqual({
    actionNeeded: '#f66',
    background: 'rgb(255, 255, 255)',
    confirmed: '#9f9',
    ink: '#0d0d0d',
    selected: '#6cf',
  });

  await page.emulateMedia({ colorScheme: 'dark' });
  const darkPreference = await page.locator('html').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      actionNeeded: style.getPropertyValue('--travel-action-needed').trim(),
      background: getComputedStyle(document.body).backgroundColor,
      confirmed: style.getPropertyValue('--travel-confirmed').trim(),
      ink: style.getPropertyValue('--travel-ink').trim(),
      selected: style.getPropertyValue('--travel-selected').trim(),
    };
  });
  expect(darkPreference).toEqual({
    actionNeeded: '#f66',
    background: 'rgb(255, 255, 255)',
    confirmed: '#9f9',
    ink: '#0d0d0d',
    selected: '#6cf',
  });

  const lightSurfaceStyles = await page.evaluate(() => {
    const composer = getComputedStyle(document.querySelector('.travel-composer--hero')!);
    const destinationName = getComputedStyle(
      document.querySelector('.destination-card__copy strong')!,
    );
    return {
      composerBackground: composer.backgroundColor,
      composerText: composer.color,
      destinationName: destinationName.color,
    };
  });
  expect(lightSurfaceStyles.composerBackground).toBe('rgba(255, 255, 255, 0.86)');
  expect(lightSurfaceStyles.composerText).toBe('rgb(13, 13, 13)');
  expect(lightSurfaceStyles.destinationName).toBe('rgb(255, 255, 255)');
});

test('serves the approved Wayfare mark as a light-blue favicon', async ({ page }) => {
  await page.goto('/');
  const faviconPaints = await page.evaluate(async () => {
    const response = await fetch('/icon.svg');
    const markup = await response.text();
    const documentNode = new DOMParser().parseFromString(markup, 'image/svg+xml');
    return Array.from(documentNode.querySelectorAll('[stroke], [fill]'))
      .flatMap((element) => [
        element.getAttribute('stroke'),
        element.getAttribute('fill'),
      ])
      .filter((paint): paint is string => Boolean(paint && paint !== 'none'));
  });

  expect([...new Set(faviconPaints)]).toEqual(['#66CCFF']);
});

test('centers every destination caption inside its jet-window safe area', async ({ page }) => {
  await page.goto('/');
  await page.locator('#places-to-start').scrollIntoViewIfNeeded();

  const geometry = await page.locator('.destination-card').evaluateAll((cards) => (
    cards.map((card) => {
      const frame = card.getBoundingClientRect();
      const copy = card.querySelector<HTMLElement>('.destination-card__copy')!;
      const bounds = copy.getBoundingClientRect();
      return {
        centerDelta: Math.abs(
          (bounds.left + (bounds.width / 2))
          - (frame.left + (frame.width / 2)),
        ),
        bottomInset: frame.bottom - bounds.bottom,
        leftInset: bounds.left - frame.left,
        rightInset: frame.right - bounds.right,
        textAlign: getComputedStyle(copy).textAlign,
      };
    })
  ));

  for (const window of geometry) {
    expect(window.centerDelta).toBeLessThanOrEqual(1);
    expect(window.bottomInset).toBeGreaterThanOrEqual(16);
    expect(window.leftInset).toBeGreaterThanOrEqual(12);
    expect(window.rightInset).toBeGreaterThanOrEqual(12);
    expect(window.textAlign).toBe('center');
  }
});

test('keeps every visible button fully rounded', async ({ page }) => {
  await page.goto('/');
  const radii = await page.locator('button:visible').evaluateAll((buttons) => (
    buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return {
        height: bounds.height,
        label: button.getAttribute('aria-label') ?? button.textContent?.trim(),
        radius: Number.parseFloat(getComputedStyle(button).borderTopLeftRadius),
      };
    })
  ));

  for (const button of radii) {
    expect(button.radius, button.label ?? 'unlabelled button')
      .toBeGreaterThanOrEqual(button.height / 2);
  }
});

test('uses Host Grotesk throughout the consumer and developer UI', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('body')).toHaveCSS('font-family', /Host Grotesk Variable/);
  const consumerFonts = await page.locator(
    '.travel-workspace, .travel-workspace h1, .travel-workspace button, .travel-workspace textarea',
  )
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).fontFamily
    )));
  expect(consumerFonts.every((font) => font.includes('Host Grotesk Variable'))).toBe(true);

  await page.goto('/developers');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveCSS('font-family', /Host Grotesk Variable/);
  await expect(page.locator('code').first()).not.toHaveCSS(
    'font-family',
    /Host Grotesk Variable/,
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
    page.getByRole('button', { name: 'Submit trip request' }).boundingBox(),
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
    const image = getComputedStyle(document.querySelector('.travel-hero__image')!);
    return { headingColor: heading.color, imageFit: image.objectFit };
  });
  expect(heroAppearance.headingColor).toBe('rgb(255, 255, 255)');
  expect(heroAppearance.imageFit).toBe('cover');

  const header = page.locator('.travel-header');
  await expect(header.getByRole('navigation', { name: 'Primary navigation' }))
    .toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Plan a trip' })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'For developers' })).toHaveCount(0);
  await expect(header).toHaveCSS('border-bottom-width', '0px');

  const menuTrigger = page.getByRole('button', { name: 'Open menu' });
  await menuTrigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Travel menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Plan a trip' })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'For developers' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await expect(menu.getByRole('button', { name: 'Plan a trip' }))
    .toHaveCSS('background-color', 'rgb(13, 13, 13)');
  const closeIconBounds = await menu.getByRole('button', { name: 'Close menu' })
    .locator('svg').boundingBox();
  expect(closeIconBounds).not.toBeNull();
  expect(closeIconBounds!.width).toBeLessThanOrEqual(20);
  expect(closeIconBounds!.height).toBeLessThanOrEqual(20);
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

test('uses one rounded hover treatment for every secondary menu action', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();

  const menu = page.getByRole('dialog', { name: 'Travel menu' });
  const actions = [
    menu.getByRole('link', { name: 'For developers' }),
    menu.getByRole('button', { name: 'Settings' }),
    menu.getByRole('link', { name: 'Support' }),
  ];
  const hoverStates = [];
  for (const action of actions) {
    await action.hover();
    await page.waitForTimeout(200);
    hoverStates.push(await action.evaluate((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: Number.parseFloat(style.borderRadius),
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        height: bounds.height,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      };
    }));
  }

  expect(new Set(hoverStates.map(({ backgroundColor }) => backgroundColor)).size)
    .toBe(1);
  for (const state of hoverStates) {
    expect(state.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(state.borderRadius).toBeGreaterThanOrEqual(state.height / 2);
    expect(state.borderTopWidth).toBe(0);
    expect(state.paddingLeft).toBe(state.paddingRight);
  }
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('menu-secondary-hover-system.png'),
  });
});

test('keeps motion reduced without restoring the retired animation layer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const transitionDurations = await page.locator('.travel-hero, .travel-hero *')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).transitionDuration
    )));
  expect(transitionDurations.every((duration) => duration === '0s')).toBe(true);
  await expect(page.locator('[data-typewriter-prompts]'))
    .toHaveText('Tokyo in spring');
  const gradientAnimations = await page.locator('.travel-editorial__mark stop')
    .evaluateAll((stops) => stops.map((stop) => getComputedStyle(stop).animationName));
  expect(gradientAnimations.every((name) => name === 'none')).toBe(true);
  await expect(page.locator('[data-wayfare-liquid="true"]'))
    .toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('[data-wayfare-liquid="true"] canvas'))
    .toHaveCSS('display', 'none');
  const liquidIconRenderers = await page.locator(
    '[data-wayfare-liquid-icon="true"]',
  ).evaluateAll((icons) => icons.map((icon) => icon.getAttribute('data-renderer')));
  expect(liquidIconRenderers).toEqual(Array(6).fill('fallback'));
  await expect(page.locator('[data-wayfare-liquid-icon="true"] canvas').first())
    .toHaveCSS('display', 'none');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menuDurations = await page.getByRole('dialog', { name: 'Travel menu' })
    .locator(':scope, :scope *')
    .evaluateAll((elements) => elements.map((element) => (
      getComputedStyle(element).transitionDuration
    )));
  expect(menuDurations.every((duration) => duration === '0s')).toBe(true);
  await expect(page.locator('[data-atmosphere-canvas]')).toHaveCount(0);
});

test('uses a premium desktop destination row and a 390px scroll-snap peek', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expectDestinationWindowsSettled(page);
  let boxes = await page.locator('.destination-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  }));
  expect(boxes).toHaveLength(5);
  expect(boxes.map(({ top }) => top)).toEqual([
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
  ]);
  expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left);
  expect(boxes[1]!.right).toBeLessThanOrEqual(boxes[2]!.left);
  expect(boxes[2]!.right).toBeLessThanOrEqual(boxes[3]!.left);
  expect(boxes[3]!.right).toBeLessThanOrEqual(boxes[4]!.left);

  await page.setViewportSize({ width: 390, height: 844 });
  boxes = await page.locator('.destination-card').evaluateAll((cards) => cards.map((card) => {
    const bounds = card.getBoundingClientRect();
    return { bottom: bounds.bottom, left: bounds.left, right: bounds.right, top: bounds.top };
  }));
  const mobileRail = await page.locator('.destination-inspiration__grid')
    .evaluate((rail) => {
      const style = getComputedStyle(rail);
      return {
        clientWidth: rail.clientWidth,
        gridAutoFlow: style.gridAutoFlow,
        overflowX: style.overflowX,
        scrollSnapType: style.scrollSnapType,
        scrollWidth: rail.scrollWidth,
      };
    });
  expect(mobileRail.gridAutoFlow).toBe('column');
  expect(mobileRail.overflowX).toBe('auto');
  expect(mobileRail.scrollSnapType).toBe('x mandatory');
  expect(mobileRail.scrollWidth).toBeGreaterThan(mobileRail.clientWidth);
  expect(boxes.map(({ top }) => top)).toEqual([
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
    boxes[0]!.top,
  ]);
  expect(boxes[0]!.right).toBeLessThan(390);
  expect(boxes[1]!.left).toBeLessThan(390);
  expect(boxes[1]!.right).toBeGreaterThan(390);
});

test('keeps tablet destination cards compact and comparable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await expectDestinationWindowsSettled(page);
  const boxes = await page.locator('.destination-card').evaluateAll((cards) => (
    cards.map((card) => {
      const bounds = card.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    })
  ));
  const widths = boxes.map(({ width }) => width);
  const heights = boxes.map(({ height }) => height);

  expect(boxes).toHaveLength(5);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
});

test('captures premium landing visual evidence at every required viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.goto('/');

  const landingMeasurements: Array<{
    headingLines: number;
    height: number;
    heroHeight: number;
    heroWidth: number;
    width: number;
  }> = [];
  for (const { height, width } of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const [headingLines, heroBounds] = await Promise.all([
      renderedTextLines(page, '#travel-home-title'),
      page.locator('.travel-hero__media').boundingBox(),
    ]);
    expect(heroBounds).not.toBeNull();
    landingMeasurements.push({
      headingLines: headingLines.length,
      height,
      heroHeight: heroBounds!.height,
      heroWidth: heroBounds!.width,
      width,
    });
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`task-6-landing-${width}x${height}.png`),
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const destinationSection = page.locator('.destination-inspiration');
  await destinationSection.evaluate((section) => {
    window.scrollTo({
      behavior: 'instant',
      top: section.getBoundingClientRect().top + window.scrollY - 16,
    });
  });
  const railCards = page.locator('.destination-card');
  const [firstRailCard, secondRailCard] = await Promise.all([
    railCards.nth(0).boundingBox(),
    railCards.nth(1).boundingBox(),
  ]);
  expect(firstRailCard).not.toBeNull();
  expect(secondRailCard).not.toBeNull();
  expect(firstRailCard!.y).toBeGreaterThanOrEqual(0);
  expect(firstRailCard!.y + firstRailCard!.height).toBeLessThanOrEqual(844);
  expect(firstRailCard!.x + firstRailCard!.width).toBeLessThan(390);
  expect(secondRailCard!.x).toBeLessThan(390);
  expect(secondRailCard!.x + secondRailCard!.width).toBeGreaterThan(390);
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('task-6-landing-390x844-destination-rail.png'),
  });
  await expect(access(testInfo.outputPath(
    'task-6-landing-390x844-destination-rail.png',
  ))).resolves.toBeUndefined();
  const landingMeasurementsPath = testInfo.outputPath(
    'task-6-landing-measurements.json',
  );
  await writeFile(
    landingMeasurementsPath,
    `${JSON.stringify(landingMeasurements, null, 2)}\n`,
  );
  await testInfo.attach('task-6-landing-measurements', {
    path: landingMeasurementsPath,
    contentType: 'application/json',
  });
});

test('submits one broad intent through one assistant turn', async ({ page }) => {
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
  const prompt = 'Plan a family trip from Toronto to Rome during spring break.';
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).fill(prompt);
  await page.getByRole('button', { name: 'Submit trip request' }).click();

  await expect.poll(() => submittedPrompts).toEqual([prompt]);
  expect(sessionRequests).toBe(1);
});

test('places the blue response cue in transcript flow and animates only the busy composer', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');

  let releaseSession = () => {};
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  let releaseTurn = () => {};
  const turnGate = new Promise<void>((resolve) => {
    releaseTurn = resolve;
  });
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    await sessionGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'browser-fixture-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        endpoints: {
          turns: 'http://127.0.0.1:3108/browser-fixture/response-cue',
          toolConfirmations: 'http://127.0.0.1:3108/browser-fixture/confirmations',
        },
      }),
    });
  });
  await page.route('**/browser-fixture/response-cue', async (route) => {
    await turnGate;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        `event: content\ndata: ${JSON.stringify({ delta: 'Here are your options.' })}`,
        'event: done\ndata: {}',
        '',
      ].join('\n\n'),
    });
  });

  try {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Ask the travel assistant' })
      .fill('Find return flights to Tokyo');
    await page.getByRole('button', { name: 'Submit trip request' }).click();

    const conversation = page.getByRole('region', { name: 'Travel conversation' });
    const transcript = conversation.getByRole('log', {
      name: 'Conversation transcript',
    });
    const traveler = conversation.getByRole('article', { name: 'Traveler message' });
    const status = conversation.getByRole('status');
    const shimmer = status.locator('.text-shimmer');
    const composer = conversation.locator('[data-wayfare-composer-beam="true"]');
    const beam = composer.locator('[data-beam]');
    const newTrip = page.getByRole('button', { name: 'New trip' });
    const currency = page.getByRole('combobox', { name: 'Currency' });

    await expect(traveler).toHaveText('Find return flights to Tokyo');
    await expect(status).toHaveText('Thinking…');
    await expect(beam).toHaveAttribute('data-active', '');
    await expect(newTrip).toBeVisible();
    expect(await newTrip.evaluate((button, currencyElement) => (
      Boolean(button.compareDocumentPosition(currencyElement as Node)
        & Node.DOCUMENT_POSITION_FOLLOWING)
    ), await currency.elementHandle())).toBe(true);
    await expect.poll(() => status.evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).fontSize)
    ))).toBeGreaterThan(14);
    await expect(shimmer).toHaveCSS(
      'background-image',
      /rgb\(47, 115, 145\).*rgb\(102, 204, 255\)/u,
    );
    expect(await transcript.evaluate((log) => {
      const travelerMessage = log.querySelector('[aria-label="Traveler message"]');
      const responseStatus = log.querySelector('[role="status"]');
      if (!travelerMessage || !responseStatus) return false;
      return Boolean(
        travelerMessage.compareDocumentPosition(responseStatus)
          & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    })).toBe(true);

    releaseSession();
    releaseTurn();
    await expect(conversation.getByText('Here are your options.')).toBeVisible();
    await expect(status).toBeEmpty();
    await expect(beam).not.toHaveAttribute('data-active', '');
  } finally {
    releaseSession();
    releaseTurn();
  }
});

test('keeps immediate chat progress and the New trip control usable on narrow screens', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  let releaseSession = () => {};
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    await sessionGate;
    await route.abort();
  });

  try {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Ask the travel assistant' })
      .fill('A weekend in Lisbon');
    await page.getByRole('button', { name: 'Submit trip request' }).click();

    const conversation = page.getByRole('region', { name: 'Travel conversation' });
    const newTrip = page.getByRole('button', { name: 'New trip' });
    const currency = page.getByRole('combobox', { name: 'Currency' });
    const menu = page.getByRole('button', { name: 'Open menu' });
    const composer = conversation.getByRole('form', { name: 'Continue trip' });

    await expect(conversation.getByRole('article', { name: 'Traveler message' }))
      .toHaveText('A weekend in Lisbon');
    await expect(conversation.getByRole('status')).toHaveText('Thinking…');
    await expect(newTrip).toBeVisible();
    await expectMinimumTargetSize(newTrip);
    await expectMinimumTargetSize(currency);
    await expectMinimumTargetSize(menu);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

    const [newTripBounds, currencyBounds, composerBounds] = await Promise.all([
      newTrip.boundingBox(),
      currency.boundingBox(),
      composer.boundingBox(),
    ]);
    expect(newTripBounds).not.toBeNull();
    expect(currencyBounds).not.toBeNull();
    expect(composerBounds).not.toBeNull();
    expect(newTripBounds!.x + newTripBounds!.width)
      .toBeLessThanOrEqual(currencyBounds!.x);
    expect(composerBounds!.x).toBeGreaterThanOrEqual(0);
    expect(composerBounds!.x + composerBounds!.width).toBeLessThanOrEqual(320);
    expect(newTripBounds!.width).toBe(44);

    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath('active-chat-progress-320x720.png'),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(390);
    await expect(newTrip).toBeVisible();
    await expectMinimumTargetSize(newTrip);
    await expectMinimumTargetSize(currency);
    await expectMinimumTargetSize(menu);
    const zoomedHeaderBounds = await Promise.all([
      page.getByRole('link', { name: 'Wayfare' }).boundingBox(),
      newTrip.boundingBox(),
      currency.boundingBox(),
      menu.boundingBox(),
    ]);
    for (const bounds of zoomedHeaderBounds) expect(bounds).not.toBeNull();
    for (let index = 1; index < zoomedHeaderBounds.length; index += 1) {
      const previous = zoomedHeaderBounds[index - 1]!;
      const current = zoomedHeaderBounds[index]!;
      expect(previous!.x + previous!.width).toBeLessThanOrEqual(current!.x);
    }
    expect(await page.getByRole('link', { name: 'Wayfare' }).evaluate((link) => (
      link.scrollWidth <= link.clientWidth
    ))).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animated = await conversation.locator(':scope, :scope *')
      .evaluateAll((elements) => elements.filter((element) => {
        if (element.getClientRects().length === 0) return false;
        const style = getComputedStyle(element);
        return style.animationDuration.split(',').some((duration) => (
          Number.parseFloat(duration) > 0
        ));
      }).length);
    expect(animated).toBe(0);
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath('active-chat-progress-zoom-390x844.png'),
    });
  } finally {
    releaseSession();
  }
});

test('proves premium active conversation, chronological nested Apps, keyboard order, text zoom, reduced motion, and single-page scrolling', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  test.setTimeout(120_000);

  let turnRequests = 0;
  const firstAssistantCopy = [
    'I found a useful set of options for your trip.',
    'RouteReferenceISBtoJFKWithoutWhitespace1234567890',
  ].join(' ');
  const secondAssistantCopy = 'You can also adjust the trip details here.';
  const result = {
    status: 'success',
    message: 'Current flight options',
    fallback: 'Current flight options',
    searchContext: {
      origin: 'ISB',
      destination: 'JFK',
      departureDate: '2026-09-18',
      returnDate: '2026-09-27',
      adults: 2,
      children: 1,
      infants: 0,
      childrenAges: [8],
      infantAges: [],
      cabinClass: 'BUSINESS',
      currency: 'EUR',
      country: 'GB',
    },
    itineraries: [],
  };
  const approvedAppHtml = (label: string, copy: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; max-width: 100%; margin: 0; overflow-x: hidden; }
      body { padding: 8px; font: 1rem/1.4 system-ui, sans-serif; }
      main, p { width: 100%; max-width: 100%; margin: 0; overflow-wrap: anywhere; }
      button {
        min-width: 44px;
        min-height: 44px;
        margin-top: 8px;
        border: 1px solid #64748b;
        border-radius: 8px;
        padding: 10px 14px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
      }
      button:focus-visible { outline: 4px solid #075985; outline-offset: -4px; }
    </style>
  </head>
  <body>
    <main>
      <p>${copy}</p>
      <button type="button" aria-label="${label}">${label}</button>
    </main>
    <script>
      const initializeId = 1;
      let lastReportedHeight = 0;
      const reportSize = () => {
        const height = document.documentElement.scrollHeight;
        if (height === lastReportedHeight) return;
        lastReportedHeight = height;
        document.documentElement.dataset.lastReportedHeight = String(height);
        document.documentElement.dataset.reportCount = String(
          Number(document.documentElement.dataset.reportCount || 0) + 1,
        );
        parent.postMessage({
          jsonrpc: '2.0',
          method: 'ui/notifications/size-changed',
          params: { height },
        }, '*');
      };
      window.reportFixtureSize = reportSize;
      addEventListener('resize', () => queueMicrotask(reportSize));
      addEventListener('message', (event) => {
        if (event.source !== parent || event.data?.id !== initializeId) return;
        parent.postMessage({
          jsonrpc: '2.0',
          method: 'ui/notifications/initialized',
          params: {},
        }, '*');
        reportSize();
      });
      parent.postMessage({
        jsonrpc: '2.0',
        id: initializeId,
        method: 'ui/initialize',
        params: {
          appInfo: { name: 'Wayfare browser fixture', version: '1.0.0' },
          appCapabilities: {},
          protocolVersion: '2025-11-21',
        },
      }, '*');
    </script>
  </body>
</html>`;
  const searchViewForTurn = (turn: number) => ({
    id: `search-view-turn-${turn}`,
    tool: 'search_flights',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/search_flights_widget',
    title: `Flight results turn ${turn}`,
    result: { status: 'success', itineraries: [] },
    html: approvedAppHtml(
      `Select search option turn ${turn}`,
      `FlightResultsReferenceISBtoJFKWithoutWhitespace${turn}1234567890`,
    ),
  });
  const starterViewForTurn = (turn: number) => ({
    id: `starter-view-turn-${turn}`,
    tool: 'open_travel_starter',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
    title: `Travel starter turn ${turn}`,
    result: { status: 'ready' },
    html: approvedAppHtml(
      `Adjust trip turn ${turn}`,
      `TravelStarterReferenceWithoutWhitespace${turn}1234567890`,
    ),
  });
  const mismatchedViewForTurn = (turn: number) => ({
    id: `mismatched-view-turn-${turn}`,
    tool: 'search_flights',
    resourceUri: 'ui://nuitee_travel_mcp_app_starter/open_travel_starter_widget',
    title: `Mismatched travel view turn ${turn}`,
    result: { status: 'success' },
    html: '<!doctype html><html><body><main>Must not mount</main></body></html>',
  });
  const searchView = searchViewForTurn(1);
  const starterView = starterViewForTurn(1);
  const mismatchedView = mismatchedViewForTurn(1);
  const frame = (event: string, data: unknown) => (
    `event: ${event}\ndata: ${JSON.stringify(data)}`
  );

  await page.route('**/v1/assistant/public-sessions', async (route) => {
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
    turnRequests += 1;
    const searchViewForRequest = searchViewForTurn(turnRequests);
    const starterViewForRequest = starterViewForTurn(turnRequests);
    const mismatchedViewForRequest = mismatchedViewForTurn(turnRequests);
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        frame('content', {
          delta: firstAssistantCopy,
        }),
        ...(turnRequests === 1 ? [
          frame('tool_proposed', {
            id: 'confirm-search-turn-1',
            tool: 'select_flight_offer',
            title: 'Save this fare?',
            description: 'Keep this selection ready for verification.',
            arguments: { origin: 'ISB', destination: 'JFK' },
          }),
          frame('input_requested', {
            id: 'input-search-turn-1',
            message: 'Complete the remaining trip details.',
            expiresAt: '2099-01-01T00:00:00.000Z',
            requestedSchema: {
              type: 'object',
              properties: {
                departureDate: {
                  type: 'string',
                  format: 'date',
                  title: 'Departure date',
                },
                cabinClass: {
                  type: 'string',
                  title: 'Cabin',
                  enum: ['ECONOMY', 'BUSINESS'],
                },
              },
              required: ['departureDate'],
            },
          }),
        ] : []),
        frame('view_available', searchViewForRequest),
        frame('content', {
          delta: secondAssistantCopy,
        }),
        frame('view_available', starterViewForRequest),
        frame('view_available', mismatchedViewForRequest),
        frame('tool_completed', {
          id: `typed-search-result-turn-${turnRequests}`,
          tool: 'search_flights',
          result,
        }),
        frame('tool_completed', {
          id: `selected-flight-turn-${turnRequests}`,
          tool: 'select_flight_offer',
          result: {
            status: 'selected',
            selectionId: 'sel_0123456789abcdef0123456789abcdef',
          },
        }),
        frame('done', {}),
        '',
      ].join('\n\n'),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' })
    .fill('Karachi to London tomorrow for nine people in First class, paid in EUR');
  await page.getByRole('button', { name: 'Submit trip request' }).click();
  await expect.poll(() => turnRequests).toBe(1);

  const conversation = page.getByRole('region', { name: 'Travel conversation' });
  const transcript = conversation.getByRole('log', {
    name: 'Conversation transcript',
  }).locator('..');
  const apps = transcript.locator('noodle-app-view');
  const appSurfaceAt = (index: number) => {
    const turn = Math.floor(index / 2) + 1;
    const isSearch = index % 2 === 0;
    const host = apps.nth(index);
    const outerFrame = host.locator('iframe').first();
    const proxyDocument = outerFrame.contentFrame();
    const innerFrame = proxyDocument.locator('iframe');
    const appDocument = innerFrame.contentFrame();
    const controlName = isSearch
      ? `Select search option turn ${turn}`
      : `Adjust trip turn ${turn}`;
    return {
      appDocument,
      control: appDocument.getByRole('button', { name: controlName }),
      host,
      innerFrame,
      main: appDocument.locator('main'),
      outerFrame,
      turn,
    };
  };
  const appTextMetricsAt = (index: number) => appSurfaceAt(index).main.evaluate((main) => {
    const paragraph = main.querySelector('p');
    const control = main.querySelector('button');
    if (!paragraph || !control) throw new Error('Expected fixture text and control');
    return {
      controlFontSize: Number.parseFloat(getComputedStyle(control).fontSize),
      paragraphFontSize: Number.parseFloat(getComputedStyle(paragraph).fontSize),
    };
  });
  const assertHorizontallyContained = (
    bounds: { x: number; width: number } | null,
    containerBounds: { x: number; width: number } | null,
    viewportWidth: number,
  ) => {
    expect(bounds).not.toBeNull();
    expect(containerBounds).not.toBeNull();
    if (!bounds || !containerBounds) return;
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.x).toBeGreaterThanOrEqual(Math.max(0, containerBounds.x) - 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      Math.min(viewportWidth, containerBounds.x + containerBounds.width) + 1,
    );
  };
  const assertAppSurfaceFits = async (
    index: number,
    conversationBounds: { x: number; width: number } | null,
    viewportWidth: number,
  ) => {
    const surface = appSurfaceAt(index);
    const [hostBounds, outerFrameBounds, innerFrameBounds, mainBounds, controlBounds] = await Promise.all([
      surface.host.boundingBox(),
      surface.outerFrame.boundingBox(),
      surface.innerFrame.boundingBox(),
      surface.main.boundingBox(),
      surface.control.boundingBox(),
    ]);
    assertHorizontallyContained(hostBounds, conversationBounds, viewportWidth);
    assertHorizontallyContained(outerFrameBounds, hostBounds, viewportWidth);
    assertHorizontallyContained(innerFrameBounds, outerFrameBounds, viewportWidth);
    assertHorizontallyContained(mainBounds, innerFrameBounds, viewportWidth);
    assertHorizontallyContained(controlBounds, innerFrameBounds, viewportWidth);

    const hostFit = await surface.host.evaluate((host) => {
      const shadowRoot = host.shadowRoot;
      return {
        hostFits: host.scrollWidth <= host.clientWidth,
        hasOpenShadowBoundary: shadowRoot !== null,
        shadowSurfacesFit: shadowRoot
          ? Array.from(shadowRoot.querySelectorAll<HTMLElement>('*')).every((element) => (
            element.scrollWidth <= element.clientWidth
          ))
          : false,
      };
    });
    expect(hostFit).toEqual({
      hostFits: true,
      hasOpenShadowBoundary: true,
      shadowSurfacesFit: true,
    });
    const appContentFit = await surface.main.evaluate((main) => {
      const documentElement = document.documentElement;
      const body = document.body;
      const paragraph = main.querySelector('p');
      return {
        bodyFits: body.scrollWidth <= body.clientWidth,
        bodyVerticalFits: body.scrollHeight <= body.clientHeight,
        documentFits: documentElement.scrollWidth <= documentElement.clientWidth,
        documentVerticalFits: documentElement.scrollHeight <= documentElement.clientHeight,
        mainFits: main.scrollWidth <= main.clientWidth,
        paragraphFits: paragraph !== null
          && paragraph.scrollWidth <= paragraph.clientWidth,
      };
    });
    expect(appContentFit).toEqual({
      bodyFits: true,
      bodyVerticalFits: true,
      documentFits: true,
      documentVerticalFits: true,
      mainFits: true,
      paragraphFits: true,
    });
  };
  await expect(conversation).toBeVisible();
  await expect(page.getByRole('region', { name: 'Travel workspace' }))
    .toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Flight workspace' }))
    .toHaveCount(0);
  await expect(page.locator('.travel-journey-workspace, .travel-journey-canvas'))
    .toHaveCount(0);
  await expect(apps).toHaveCount(2);
  for (const index of [0, 1]) {
    await expect(appSurfaceAt(index).control).toBeVisible();
  }
  await expect(conversation.getByText('This travel view is unavailable.'))
    .toBeVisible();

  const renderedPartOrder = await transcript
    .locator('article.travel-message--assistant')
    .evaluate((message) => Array.from(message.children).map((child) => {
      const app = child.matches('noodle-app-view')
        ? child
        : child.querySelector('noodle-app-view');
      if (app) return (app as HTMLElement & { view?: { id?: string } }).view?.id;
      if (child.getAttribute('aria-label')) return child.getAttribute('aria-label');
      return child.textContent?.trim();
    }));
  expect(renderedPartOrder).toEqual([
    firstAssistantCopy,
    'Confirmation request',
    'Input request',
    'search-view-turn-1',
    secondAssistantCopy,
    'starter-view-turn-1',
    'This travel view is unavailable.',
  ]);
  await expect.poll(() => apps.evaluateAll((elements) => elements.map((element) => {
    const view = (element as HTMLElement & {
      view?: { id?: string; tool?: string; resourceUri?: string };
    }).view;
    return {
      id: view?.id,
      tool: view?.tool,
      resourceUri: view?.resourceUri,
    };
  }))).toEqual([
    {
      id: searchView.id,
      tool: searchView.tool,
      resourceUri: searchView.resourceUri,
    },
    {
      id: starterView.id,
      tool: starterView.tool,
      resourceUri: starterView.resourceUri,
    },
  ]);
  expect(await apps.evaluateAll((elements, mismatchedId) => elements.some((element) => (
    (element as HTMLElement & { view?: { id?: string } }).view?.id === mismatchedId
  )), mismatchedView.id)).toBe(false);
  await apps.evaluateAll((elements) => elements.forEach((element, index) => {
    (element as HTMLElement).dataset.initialViewIdentity = index === 0
      ? 'search-view-turn-1'
      : 'starter-view-turn-1';
  }));

  const currentTrip = page.getByRole('region', { name: 'Current trip' });
  await expect(currentTrip).toContainText('ISB → JFK');
  await expect(currentTrip).toContainText('2026-09-18');
  await expect(currentTrip).toContainText('2 adults, 1 child');
  await expect(currentTrip).toContainText('Business');
  await expect(currentTrip).not.toContainText('2026-09-27');
  await expect(currentTrip).not.toContainText('EUR');
  await expect(currentTrip).not.toContainText('GB market');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('task-6-active-compact-1440x1000.png'),
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await currentTrip.getByRole('button', { name: 'Show trip details' }).click();
  await expect(currentTrip).toContainText('2026-09-27');
  await expect(currentTrip).toContainText('EUR');
  await expect(currentTrip).toContainText('GB market');
  await currentTrip.getByRole('button', { name: 'Hide trip details' }).click();
  await expect(currentTrip).not.toContainText('2026-09-27');
  await expect(currentTrip).not.toContainText('Karachi');
  await expect(currentTrip).not.toContainText('London');
  await expect(currentTrip).not.toContainText('First');
  const routeProgress = currentTrip.getByLabel('Trip progress');
  await expect(routeProgress).toHaveAttribute('data-phase', 'selected');
  await expect(routeProgress.locator('[data-complete="true"]')).toHaveCount(4);

  const primaryAction = transcript.getByRole('button', { name: 'Confirm' });
  const primaryActionAppearance = await primaryAction.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontSize: Number.parseFloat(style.fontSize),
      fontWeight: Number.parseInt(style.fontWeight, 10),
    };
  });
  expect(primaryActionAppearance.fontSize).toBeLessThan(24);
  expect(primaryActionAppearance.fontWeight).toBeLessThan(700);
  const primaryActionContrast = renderedContrastRatio(
    primaryActionAppearance.color,
    primaryActionAppearance.backgroundColor,
  );
  expect(primaryActionAppearance.fontSize).toBe(16);
  expect(primaryActionAppearance.fontWeight).toBe(400);
  expect(primaryActionContrast).toBeGreaterThanOrEqual(4.5);

  const responsiveMeasurements: Array<{
    appCount: number;
    conversationWidth: number;
    conversationX: number;
    width: number;
  }> = [];
  for (const requiredWidth of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width: requiredWidth, height: 900 });
    await expect.poll(() => page.evaluate(() => (
      document.documentElement.scrollWidth
    ))).toBe(requiredWidth);
    const conversationBounds = await conversation.boundingBox();
    expect(conversationBounds).not.toBeNull();
    expect(conversationBounds!.width).toBeLessThanOrEqual(1024);
    expect(Math.abs(
      conversationBounds!.x + (conversationBounds!.width / 2) - (requiredWidth / 2),
    )).toBeLessThanOrEqual(2);
    await expect(apps).toHaveCount(2);
    responsiveMeasurements.push({
      appCount: await apps.count(),
      conversationWidth: conversationBounds!.width,
      conversationX: conversationBounds!.x,
      width: requiredWidth,
    });

    const prose = transcript.getByText(firstAssistantCopy, { exact: true });
    const [transcriptBounds, proseBounds, travelerMessageBounds] = await Promise.all([
      transcript.boundingBox(),
      prose.boundingBox(),
      transcript.getByRole('article', { name: 'Traveler message' }).first().boundingBox(),
    ]);
    assertHorizontallyContained(transcriptBounds, conversationBounds, requiredWidth);
    assertHorizontallyContained(proseBounds, conversationBounds, requiredWidth);
    assertHorizontallyContained(travelerMessageBounds, conversationBounds, requiredWidth);
    expect(await transcript.evaluate((element) => (
      element.scrollWidth <= element.clientWidth
    ))).toBe(true);

    const proseFit = await prose.evaluate((element) => {
      const token = 'RouteReferenceISBtoJFKWithoutWhitespace1234567890';
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const start = node.textContent?.indexOf(token) ?? -1;
        if (start < 0) continue;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + token.length);
        return {
          contentFits: element.scrollWidth <= element.clientWidth,
          rects: Array.from(range.getClientRects()).map((rect) => ({
            left: rect.left,
            right: rect.right,
          })),
        };
      }
      return { contentFits: false, rects: [] };
    });
    expect(proseFit.contentFits).toBe(true);
    expect(proseFit.rects.length).toBeGreaterThan(0);
    for (const rect of proseFit.rects) {
      expect(rect.left).toBeGreaterThanOrEqual(conversationBounds!.x - 1);
      expect(rect.right).toBeLessThanOrEqual(
        Math.min(requiredWidth, conversationBounds!.x + conversationBounds!.width) + 1,
      );
    }

    for (const index of [0, 1]) {
      await assertAppSurfaceFits(index, conversationBounds, requiredWidth);
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const [assistantCopyBounds, firstAppBounds, travelerBounds, conversationBounds] = await Promise.all([
    transcript.getByText('I found a useful set of options for your trip.').boundingBox(),
    apps.first().boundingBox(),
    transcript.getByRole('article', { name: 'Traveler message' }).first().boundingBox(),
    conversation.boundingBox(),
  ]);
  for (const bounds of [assistantCopyBounds, firstAppBounds, travelerBounds, conversationBounds]) {
    expect(bounds).not.toBeNull();
  }
  expect(assistantCopyBounds!.width).toBeLessThan(firstAppBounds!.width);
  expect(travelerBounds!.x).toBeGreaterThan(assistantCopyBounds!.x);
  const transcriptContentRight = await transcript.evaluate((element) => {
    const content = element.querySelector('ol');
    if (!content) throw new Error('Expected transcript content');
    const transcriptBounds = element.getBoundingClientRect();
    const contentStyles = getComputedStyle(content);
    return transcriptBounds.left + element.clientLeft + element.clientWidth
      - Number.parseFloat(contentStyles.paddingRight);
  });
  expect(Math.abs(
    travelerBounds!.x + travelerBounds!.width - transcriptContentRight,
  )).toBeLessThanOrEqual(2);

  const continueInput = conversation.getByRole('textbox', {
    name: 'Ask the travel assistant',
  });
  const continueButton = conversation.getByRole('button', {
    name: 'Continue trip',
  });
  const firstSearchControl = appSurfaceAt(0).control;
  const firstStarterControl = appSurfaceAt(1).control;
  const declineConfirmation = transcript.getByRole('button', {
    name: "Don't proceed",
  });
  const departureDate = transcript.getByLabel('Departure date');
  const cabin = transcript.getByRole('combobox', { name: 'Cabin' });
  const submitInput = transcript.getByRole('button', { name: 'Continue' });
  const cancelInput = transcript.getByRole('button', { name: 'Cancel request' });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const keyboardTargets = [
    { label: 'confirmation accept', locator: primaryAction },
    { label: 'confirmation decline', locator: declineConfirmation },
    { label: 'input departure date', locator: departureDate },
    { label: 'input cabin', locator: cabin },
    { label: 'input continue', locator: submitInput },
    { label: 'input cancel', locator: cancelInput },
    { label: 'search App control', locator: firstSearchControl },
    { label: 'starter App control', locator: firstStarterControl },
    { label: 'conversation composer', locator: continueInput },
  ] as const;
  const keyboardOrder: string[] = [];
  for (
    let index = 0;
    index < 32 && keyboardOrder.length < keyboardTargets.length;
    index += 1
  ) {
    await page.keyboard.press('Tab');
    for (const target of keyboardTargets) {
      if (
        !keyboardOrder.includes(target.label)
        && await target.locator.evaluate((control) => document.activeElement === control)
      ) {
        keyboardOrder.push(target.label);
      }
    }
  }
  expect(keyboardOrder).toEqual(keyboardTargets.map(({ label }) => label));
  for (const appControl of [firstSearchControl, firstStarterControl]) {
    await appControl.focus();
    await expect(appControl).toBeFocused();
    const appFocusAppearance = await appControl.evaluate((control) => {
      const style = getComputedStyle(control);
      return {
        focusVisible: control.matches(':focus-visible'),
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(appFocusAppearance.focusVisible).toBe(true);
    expect(appFocusAppearance.outlineStyle).not.toBe('none');
    expect(appFocusAppearance.outlineWidth).toBeGreaterThanOrEqual(4);
    expect(appFocusAppearance.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
    await expectMinimumTargetSize(appControl);
  }
  await continueInput.fill('Avoid overnight connections');
  await continueInput.press('Tab');
  await expect(continueButton).toBeFocused();
  const focusAppearance = await continueButton.evaluate((button) => {
    const style = getComputedStyle(button);
    return {
      boxShadow: style.boxShadow,
      focusVisible: button.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusAppearance.focusVisible).toBe(true);
  expect(focusAppearance.outlineStyle).not.toBe('none');
  expect(focusAppearance.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focusAppearance.boxShadow).toContain('rgb(102, 204, 255)');
  await expectMinimumTargetSize(continueInput);
  await expectMinimumTargetSize(continueButton);

  for (let index = 0; index < 4; index += 1) {
    await continueInput.fill(`Keep preference ${index + 1} in the trip`);
    await continueButton.click();
    await expect.poll(() => turnRequests).toBe(index + 2);
  }
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollHeight > window.innerHeight
  ))).toBe(true);
  const scrollOwnership = await transcript.evaluate((viewport) => ({
    overflowY: getComputedStyle(viewport).overflowY,
    scrollTop: viewport.scrollTop,
  }));
  expect(scrollOwnership.overflowY).toBe('visible');
  expect(scrollOwnership.scrollTop).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const composer = conversation.getByRole('form', { name: 'Continue trip' });
  const composerBeam = composer.locator(
    'xpath=ancestor::*[@data-wayfare-composer-beam="true"]',
  );
  await expect(composer).toBeVisible();
  const composerBounds = await composer.boundingBox();
  expect(composerBounds).not.toBeNull();
  expect(composerBounds!.y).toBeGreaterThanOrEqual(0);
  expect(composerBounds!.y + composerBounds!.height).toBeLessThanOrEqual(900);
  await expect(apps).toHaveCount(10);
  expect(await apps.evaluateAll((elements) => elements.map((element) => (
    (element as HTMLElement & { view?: { id?: string } }).view?.id
  )))).toEqual([
    'search-view-turn-1',
    'starter-view-turn-1',
    'search-view-turn-2',
    'starter-view-turn-2',
    'search-view-turn-3',
    'starter-view-turn-3',
    'search-view-turn-4',
    'starter-view-turn-4',
    'search-view-turn-5',
    'starter-view-turn-5',
  ]);
  const approvedViewIds = await apps.evaluateAll((elements) => elements.map((element) => (
    (element as HTMLElement & { view?: { id?: string } }).view?.id
  )));
  expect(new Set(approvedViewIds).size).toBe(approvedViewIds.length);
  const initialHostsAfterLaterTurns = await transcript
    .locator('[data-initial-view-identity]')
    .evaluateAll((elements) => elements.map((element) => {
      const host = element as HTMLElement & { view?: { id?: string } };
      return {
        connected: host.isConnected,
        initialIdentity: host.dataset.initialViewIdentity,
        currentIdentity: host.view?.id,
      };
    }));
  expect(initialHostsAfterLaterTurns).toEqual([
    {
      connected: true,
      initialIdentity: 'search-view-turn-1',
      currentIdentity: 'search-view-turn-1',
    },
    {
      connected: true,
      initialIdentity: 'starter-view-turn-1',
      currentIdentity: 'starter-view-turn-1',
    },
  ]);
  const mismatchedViewIds = Array.from(
    { length: 5 },
    (_, index) => mismatchedViewForTurn(index + 1).id,
  );
  expect(await apps.evaluateAll((elements, rejectedIds) => elements.some((element) => (
    rejectedIds.includes(
      (element as HTMLElement & { view?: { id?: string } }).view?.id ?? '',
    )
  )), mismatchedViewIds)).toBe(false);
  const chronologicalTranscript = await transcript.locator('article').evaluateAll((articles) => (
    articles.map((article) => ({
      label: article.getAttribute('aria-label'),
      parts: Array.from(article.children).map((child) => {
        const app = child.matches('noodle-app-view')
          ? child
          : child.querySelector('noodle-app-view');
        if (app) return (app as HTMLElement & { view?: { id?: string } }).view?.id;
        if (child.getAttribute('aria-label')) return child.getAttribute('aria-label');
        return child.textContent?.trim();
      }),
    }))
  ));
  expect(chronologicalTranscript.map(({ label }) => label)).toEqual([
    'Traveler message',
    'Assistant message',
    'Traveler message',
    'Assistant message',
    'Traveler message',
    'Assistant message',
    'Traveler message',
    'Assistant message',
    'Traveler message',
    'Assistant message',
  ]);
  for (let turn = 1; turn <= 5; turn += 1) {
    expect(chronologicalTranscript[(turn * 2) - 1]?.parts).toEqual([
      firstAssistantCopy,
      ...(turn === 1 ? ['Confirmation request', 'Input request'] : []),
      searchViewForTurn(turn).id,
      secondAssistantCopy,
      starterViewForTurn(turn).id,
      'This travel view is unavailable.',
    ]);
  }

  for (const target of await conversation.locator(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
  ).all()) {
    if (await target.isVisible()) await expectMinimumTargetSize(target);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motionScan = await page.locator('.travel-workspace, .travel-workspace *')
    .evaluateAll((elements) => {
    const seconds = (durationList: string) => durationList.split(',').map((entry) => {
      const duration = entry.trim();
      const value = Number.parseFloat(duration) || 0;
      return duration.endsWith('ms') ? value / 1000 : value;
    });
    return {
      scannedWorkspaceRoot: elements.some((element) => element.classList.contains('travel-workspace')),
      active: elements.flatMap((element) => {
        if (element.getClientRects().length === 0) return [];
        const style = getComputedStyle(element);
        const timing = {
          animation: seconds(style.animationDuration),
          transition: seconds(style.transitionDuration),
        };
        return timing.animation.some((duration) => duration > 0)
          || timing.transition.some((duration) => duration > 0.00001)
          ? [{
            ...timing,
            className: element.className,
            tagName: element.tagName,
          }]
          : [];
      }),
    };
  });
  expect(motionScan.scannedWorkspaceRoot).toBe(true);
  expect(motionScan.active).toEqual([]);
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('task-6-active-reduced-motion-1440x900.png'),
  });

  const normalAppTextMetrics = await Promise.all(
    Array.from({ length: 10 }, (_, index) => appTextMetricsAt(index)),
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  for (let index = 0; index < 10; index += 1) {
    await appSurfaceAt(index).appDocument.locator('html').evaluate((documentElement) => {
      documentElement.style.fontSize = '200%';
      (window as Window & { reportFixtureSize?: () => void })
        .reportFixtureSize?.();
    });
    const surface = appSurfaceAt(index);
    await expect.poll(async () => {
      const [frameBounds, resizeEvidence] = await Promise.all([
        surface.innerFrame.boundingBox(),
        surface.appDocument.locator('html').evaluate((documentElement) => ({
          documentHeight: documentElement.scrollHeight,
          lastReportedHeight: Number(documentElement.dataset.lastReportedHeight),
        })),
      ]);
      return frameBounds !== null
        && resizeEvidence.lastReportedHeight >= resizeEvidence.documentHeight
        && frameBounds.height >= resizeEvidence.documentHeight;
    }).toBe(true);
  }
  const zoomedAppTextMetrics = await Promise.all(
    Array.from({ length: 10 }, (_, index) => appTextMetricsAt(index)),
  );
  for (let index = 0; index < 10; index += 1) {
    expect(zoomedAppTextMetrics[index]!.controlFontSize).toBeCloseTo(
      normalAppTextMetrics[index]!.controlFontSize * 2,
      1,
    );
    expect(zoomedAppTextMetrics[index]!.paragraphFontSize).toBeCloseTo(
      normalAppTextMetrics[index]!.paragraphFontSize * 2,
      1,
    );
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await expect(composer).toBeVisible();
  const zoomedComposerBounds = await composer.boundingBox();
  expect(zoomedComposerBounds).not.toBeNull();
  expect(zoomedComposerBounds!.y).toBeGreaterThanOrEqual(0);
  expect(zoomedComposerBounds!.y + zoomedComposerBounds!.height).toBeLessThanOrEqual(900);
  const zoomedComposerContents = await composer.evaluate((form) => {
    const formBounds = form.getBoundingClientRect();
    const input = form.querySelector('textarea');
    const action = form.querySelector('button');
    if (!input || !action) throw new Error('Expected composer input and action');
    const inputBounds = input.getBoundingClientRect();
    const actionBounds = action.getBoundingClientRect();
    return {
      actionBottom: actionBounds.bottom,
      actionTop: actionBounds.top,
      formBottom: formBounds.bottom,
      formTop: formBounds.top,
      inputBottom: inputBounds.bottom,
      inputClientHeight: input.clientHeight,
      inputScrollHeight: input.scrollHeight,
      inputTop: inputBounds.top,
    };
  });
  expect(zoomedComposerContents.inputScrollHeight)
    .toBeLessThanOrEqual(zoomedComposerContents.inputClientHeight);
  expect(zoomedComposerContents.inputTop)
    .toBeGreaterThanOrEqual(zoomedComposerContents.formTop);
  expect(zoomedComposerContents.inputBottom)
    .toBeLessThanOrEqual(zoomedComposerContents.formBottom);
  expect(zoomedComposerContents.actionTop)
    .toBeGreaterThanOrEqual(zoomedComposerContents.formTop);
  expect(zoomedComposerContents.actionBottom)
    .toBeLessThanOrEqual(zoomedComposerContents.formBottom);
  await expect(apps).toHaveCount(10);
  const [zoomedConversationBounds, zoomedTranscriptBounds, zoomedProseBounds] = await Promise.all([
    conversation.boundingBox(),
    transcript.boundingBox(),
    transcript.getByText(firstAssistantCopy, { exact: true }).first().boundingBox(),
  ]);
  assertHorizontallyContained(zoomedTranscriptBounds, zoomedConversationBounds, 390);
  assertHorizontallyContained(zoomedProseBounds, zoomedConversationBounds, 390);
  const zoomedOverflow = await conversation.locator(':scope, :scope *')
    .evaluateAll((elements) => elements.flatMap((element) => {
      const bounds = element.getBoundingClientRect();
      const overflowsOwnBox = element.scrollWidth > element.clientWidth + 1;
      const exceedsViewport = bounds.left < -1 || bounds.right > window.innerWidth + 1;
      return overflowsOwnBox || exceedsViewport
        ? [{
          className: element.className,
          clientWidth: element.clientWidth,
          left: bounds.left,
          right: bounds.right,
          role: element.getAttribute('role'),
          scrollWidth: element.scrollWidth,
          tagName: element.tagName,
        }]
        : [];
    }));
  expect(zoomedOverflow).toEqual([]);
  expect(await transcript.evaluate((element) => (
    element.scrollWidth <= element.clientWidth
  ))).toBe(true);
  for (let index = 0; index < 10; index += 1) {
    await assertAppSurfaceFits(index, zoomedConversationBounds, 390);
    await expectMinimumTargetSize(appSurfaceAt(index).control);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath('task-6-active-zoom-390x900.png'),
  });
  await page.setViewportSize({ width: 390, height: 1600 });
  for (let index = 0; index < 10; index += 1) {
    const surface = appSurfaceAt(index);
    await surface.host.scrollIntoViewIfNeeded();
    await expect(surface.control).toBeVisible();
    await surface.main.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`task-6-zoomed-app-${index + 1}.png`),
    });
  }
  const hostBoundaryMeasurements = [] as Array<{
    composer: { height: number; width: number; x: number; y: number };
    host: { height: number; width: number; x: number; y: number };
    index: number;
    innerFrame: { height: number; width: number; x: number; y: number };
    outerFrame: { height: number; width: number; x: number; y: number };
    position: string;
    transcript: { height: number; width: number; x: number; y: number };
  }>;
  for (const { index, position } of [
    { index: 0, position: 'first' },
    { index: 5, position: 'middle' },
    { index: 9, position: 'last' },
  ]) {
    const surface = appSurfaceAt(index);
    await surface.host.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(surface.control).toBeVisible();
    await surface.host.evaluate((host) => {
      host.style.outline = '4px solid #7c3aed';
      host.style.outlineOffset = '-4px';
    });
    await surface.outerFrame.evaluate((frame) => {
      frame.style.outline = '4px solid #d97706';
      frame.style.outlineOffset = '-8px';
    });
    await surface.innerFrame.evaluate((frame) => {
      frame.style.outline = '4px solid #0891b2';
      frame.style.outlineOffset = '-12px';
    });
    const [hostBounds, outerFrameBounds, innerFrameBounds, transcriptBounds, composerFrameBounds] = await Promise.all([
      surface.host.boundingBox(),
      surface.outerFrame.boundingBox(),
      surface.innerFrame.boundingBox(),
      transcript.boundingBox(),
      composer.boundingBox(),
    ]);
    expect(hostBounds).not.toBeNull();
    expect(outerFrameBounds).not.toBeNull();
    expect(innerFrameBounds).not.toBeNull();
    expect(transcriptBounds).not.toBeNull();
    expect(composerFrameBounds).not.toBeNull();
    expect(hostBounds!.y).toBeGreaterThanOrEqual(transcriptBounds!.y - 1);
    expect(hostBounds!.y + hostBounds!.height).toBeLessThanOrEqual(
      transcriptBounds!.y + transcriptBounds!.height + 1,
    );
    assertHorizontallyContained(outerFrameBounds, hostBounds, 390);
    assertHorizontallyContained(innerFrameBounds, outerFrameBounds, 390);
    expect(await composerBeam.evaluate((element) => getComputedStyle(element).position))
      .toBe('sticky');
    expect(composerFrameBounds!.y).toBeGreaterThanOrEqual(0);
    expect(composerFrameBounds!.y + composerFrameBounds!.height)
      .toBeLessThanOrEqual(1600);
    const bounds = {
      composer: composerFrameBounds!,
      host: hostBounds!,
      index,
      innerFrame: innerFrameBounds!,
      outerFrame: outerFrameBounds!,
      position,
      transcript: transcriptBounds!,
    };
    hostBoundaryMeasurements.push(bounds);
    await page.evaluate((evidence) => {
      const layer = document.createElement('div');
      layer.id = 'task-6-boundary-evidence';
      Object.assign(layer.style, {
        inset: '0',
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: '2147483647',
      });
      const addBadge = (
        label: string,
        color: string,
        left: number,
        top: number,
      ) => {
        const badge = document.createElement('span');
        badge.textContent = label;
        Object.assign(badge.style, {
          background: color,
          borderRadius: '3px',
          color: '#ffffff',
          font: '600 10px/14px system-ui, sans-serif',
          left: `${Math.max(0, left)}px`,
          padding: '1px 4px',
          position: 'fixed',
          top: `${Math.max(0, top)}px`,
        });
        layer.append(badge);
      };
      if (evidence.position === 'middle') {
        const legendTop = evidence.host.y - 20;
        addBadge('host', '#7c3aed', evidence.host.x + 5, legendTop);
        addBadge('proxy', '#d97706', evidence.host.x + 50, legendTop);
        addBadge('App', '#0891b2', evidence.host.x + 102, legendTop);
      } else {
        addBadge(
          'noodle-app-view host',
          '#7c3aed',
          evidence.host.x + 5,
          evidence.host.y + 5,
        );
        addBadge(
          'outer proxy iframe',
          '#d97706',
          evidence.outerFrame.x + 5,
          evidence.outerFrame.y + 5,
        );
        addBadge(
          'inner App iframe',
          '#0891b2',
          evidence.innerFrame.x + 5,
          evidence.innerFrame.y + 23,
        );
      }
      addBadge(
        'transcript viewport',
        '#475569',
        evidence.transcript.x + evidence.transcript.width - 108,
        evidence.transcript.y + 5,
      );
      addBadge(
        'conversation composer',
        '#0d0d0d',
        evidence.composer.x + 5,
        evidence.position === 'middle'
          ? evidence.composer.y - 20
          : evidence.composer.y + 5,
      );
      document.body.append(layer);
    }, bounds);
    const middleClip = position === 'middle'
      ? {
          x: 0,
          y: Math.max(0, transcriptBounds!.y - 16),
          width: 390,
          height: Math.min(
            1600,
            composerFrameBounds!.y + composerFrameBounds!.height + 11,
          ) - Math.max(0, transcriptBounds!.y - 16),
        }
      : null;
    if (middleClip) {
      expect(middleClip.y).toBeLessThan(transcriptBounds!.y);
      expect(middleClip.y + middleClip.height).toBeGreaterThanOrEqual(
        composerFrameBounds!.y + composerFrameBounds!.height,
      );
      expect(middleClip.height).toBeLessThanOrEqual(1120);
    }
    await page.screenshot({
      animations: 'disabled',
      ...(middleClip ? { clip: middleClip } : {}),
      path: testInfo.outputPath(
        `task-6-zoomed-host-boundary-${position}.png`,
      ),
    });
    await page.locator('#task-6-boundary-evidence').evaluate((layer) => {
      layer.remove();
    });
    await surface.host.evaluate((host) => {
      host.style.outline = '';
      host.style.outlineOffset = '';
    });
    await surface.outerFrame.evaluate((frame) => {
      frame.style.outline = '';
      frame.style.outlineOffset = '';
    });
    await surface.innerFrame.evaluate((frame) => {
      frame.style.outline = '';
      frame.style.outlineOffset = '';
    });
    await expect(access(testInfo.outputPath(
      `task-6-zoomed-host-boundary-${position}.png`,
    ))).resolves.toBeUndefined();
    if (position === 'middle') {
      const screenshot = await readFile(testInfo.outputPath(
        'task-6-zoomed-host-boundary-middle.png',
      ));
      expect(screenshot.readUInt32BE(16)).toBe(390);
      expect(screenshot.readUInt32BE(20)).toBeLessThanOrEqual(1120);
    }
  }
  const measurementsPath = testInfo.outputPath('task-6-measurements.json');
  await writeFile(measurementsPath, `${JSON.stringify({
      composer: composerBounds,
      hostBoundaries: hostBoundaryMeasurements,
      primaryAction: {
        ...primaryActionAppearance,
        contrast: primaryActionContrast,
      },
      responsive: responsiveMeasurements,
      routeProgress: { completedSegments: 3, phase: 'comparing' },
      transcript: scrollOwnership,
      zoomedAppText: zoomedAppTextMetrics[0],
      zoomedComposer: zoomedComposerBounds,
      zoomedComposerContents,
      zoomedOverflowCount: zoomedOverflow.length,
      zoomedPageWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      zoomedNormalAppText: normalAppTextMetrics[0],
    }, null, 2)}\n`);
  await testInfo.attach('task-6-measurements', {
    path: measurementsPath,
    contentType: 'application/json',
  });
});

test('keeps the developer route static, legal-safe, and set in Host Grotesk', async ({ page }) => {
  const assistantRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/v1/assistant/')) assistantRequests.push(request.url());
  });
  await page.goto('/developers');
  await page.evaluate(() => document.fonts.ready);

  await expect(page.getByRole('heading', { level: 1, name: 'One integration, three travel views' }))
    .toBeVisible();
  await expect(page.getByText(/Search → Compare → Verify/)).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family', /Host Grotesk Variable/);
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
  await expect(page.getByRole('button', { name: 'Submit trip request' }))
    .toHaveCSS('min-height', '44px');
  const [mobileInput, mobileSubmit] = await Promise.all([
    page.getByRole('textbox', { name: 'Ask the travel assistant' }).boundingBox(),
    page.getByRole('button', { name: 'Submit trip request' }).boundingBox(),
  ]);
  expect(mobileInput).not.toBeNull();
  expect(mobileSubmit).not.toBeNull();
  expect(mobileInput!.y + mobileInput!.height)
    .toBeLessThanOrEqual(mobileSubmit!.y);
  expect(await page.getByRole('textbox', { name: 'Ask the travel assistant' })
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
  const submitContentsFit = await page.getByRole('button', { name: 'Submit trip request' })
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
  expect(await page.getByRole('textbox', { name: 'Ask the travel assistant' })
    .evaluate((input) => input.scrollHeight <= input.clientHeight)).toBe(true);
  for (const target of [
    page.getByRole('button', { name: 'Open menu' }),
    page.getByRole('button', { name: 'Submit trip request' }),
    page.getByRole('contentinfo').getByRole('link', { name: 'Support' }),
  ]) {
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await expectMinimumTargetSize(target);
  }
});

test('keeps the agent-led first fold usable at 320px and 200 percent zoom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const composer = await page.locator('.travel-composer--hero').boundingBox();
  expect(composer).not.toBeNull();
  expect(composer!.y).toBeGreaterThanOrEqual(0);
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(720);
  await expectMinimumTargetSize(
    page.getByRole('button', { name: 'Submit trip request' }),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectHorizontalFit(page, 390);
  expect(await landingMidwordBreaks(page)).toEqual([]);
  await expect(page.locator('.destination-card button')).toHaveCount(0);
  await expect(page.locator('.travel-editorial button')).toHaveCount(0);
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

test('keeps 390px passive inspiration and editorial content contained', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectDestinationWindowsSettled(page);

  const destinationCards = page.locator('.destination-card');
  await expect(destinationCards).toHaveCount(5);
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
    expect(bounds.width).toBe(destinationBoxes[0]?.width);
    if (index > 0) {
      expect(destinationBoxes[index - 1]!.right)
        .toBeLessThanOrEqual(bounds.left);
    }
  }
  expect(destinationBoxes.map(({ top }) => top)).toEqual([
    destinationBoxes[0]!.top,
    destinationBoxes[0]!.top,
    destinationBoxes[0]!.top,
    destinationBoxes[0]!.top,
    destinationBoxes[0]!.top,
  ]);
  expect(destinationBoxes[0]!.right).toBeLessThan(390);
  expect(destinationBoxes[1]!.left).toBeLessThan(390);
  expect(destinationBoxes[1]!.right).toBeGreaterThan(390);

  const [editorialMark, editorialCopy] = await Promise.all([
    page.locator('.travel-editorial [data-wayfare-mark="true"]').boundingBox(),
    page.locator('.travel-editorial__copy').boundingBox(),
  ]);
  await expect(page.locator('.travel-editorial img')).toHaveCount(0);
  expect(editorialMark).not.toBeNull();
  expect(editorialCopy).not.toBeNull();
  expect(editorialMark!.y + editorialMark!.height)
    .toBeLessThanOrEqual(editorialCopy!.y);
  for (const bounds of [editorialMark!, editorialCopy!]) {
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }

  const footer = page.locator('.travel-footer');
  const footerBounds = await footer.boundingBox();
  expect(footerBounds).not.toBeNull();
  expect(footerBounds!.x).toBeGreaterThanOrEqual(0);
  expect(footerBounds!.x + footerBounds!.width).toBeLessThanOrEqual(390);
  await expect(footer.getByText('Privacy')).toHaveCount(0);
  await expect(footer.getByText('Terms')).toHaveCount(0);
  await expect(footer.getByText('Guest session')).toHaveCount(0);
  await expect(footer.getByText('Planning note')).toHaveCount(0);
  await expect(footer.locator('[data-wayfare-mark="true"]')).toHaveCount(1);
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

test('keeps the transcript as the sole flexible row before trip context exists', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.route('**/v1/assistant/public-sessions', async (route) => {
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
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        `event: content\ndata: ${JSON.stringify({
          delta: 'Tell me one more detail and I will narrow the options.',
        })}`,
        'event: done\ndata: {}',
        '',
      ].join('\n\n'),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' })
    .fill('Islamabad to Rome for two, next weekend');
  await page.getByRole('button', { name: 'Submit trip request' }).click();

  const conversation = page.getByRole('region', { name: 'Travel conversation' });
  await expect(conversation.getByText(
    'Tell me one more detail and I will narrow the options.',
  )).toBeVisible();
  await expect(conversation.getByRole('region', { name: 'Current trip' }))
    .toHaveCount(0);
  const layout = await conversation.evaluate((element) => {
    const children = Array.from(element.children) as HTMLElement[];
    const transcript = children[2]!;
    const lowerChrome = children[3]!;
    const composer = children[4]!;
    const transcriptBounds = transcript.getBoundingClientRect();
    const lowerBounds = lowerChrome.getBoundingClientRect();
    const composerBounds = composer.getBoundingClientRect();
    const status = transcript.querySelector<HTMLElement>('[role="status"]')!;
    return {
      childCount: children.length,
      areas: children.map((child) => getComputedStyle(child).gridArea),
      transcriptHeight: transcriptBounds.height,
      statusHeight: status.getBoundingClientRect().height,
      transcriptToChrome: lowerBounds.top - transcriptBounds.bottom,
      chromeToComposer: composerBounds.top - lowerBounds.bottom,
      composerBottom: composerBounds.bottom,
      viewportHeight: window.innerHeight,
    };
  });
  expect(layout.childCount).toBe(5);
  expect(layout.areas).toEqual([
    'header',
    'context',
    'transcript',
    'lower-chrome',
    'composer',
  ]);
  expect(layout.transcriptHeight).toBeGreaterThan(80);
  expect(layout.statusHeight).toBeLessThanOrEqual(32);
  expect(layout.transcriptToChrome).toBeGreaterThanOrEqual(0);
  expect(layout.transcriptToChrome).toBeLessThanOrEqual(16);
  expect(layout.chromeToComposer).toBeGreaterThanOrEqual(0);
  expect(layout.chromeToComposer).toBeLessThanOrEqual(16);
  expect(layout.composerBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('anchors the composer to the bottom safe area for a short conversation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'browser-fixture-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        endpoints: {
          turns: 'http://127.0.0.1:3108/browser-fixture/short-turn',
          toolConfirmations: 'http://127.0.0.1:3108/browser-fixture/confirmations',
        },
      }),
    });
  });
  await page.route('**/browser-fixture/short-turn', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: [
        `event: content\ndata: ${JSON.stringify({
          delta: 'Where would you like to go?',
        })}`,
        'event: done\ndata: {}',
        '',
      ].join('\n\n'),
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' })
    .fill('Help me plan a trip');
  await page.getByRole('button', { name: 'Submit trip request' }).click();

  const conversation = page.getByRole('region', { name: 'Travel conversation' });
  await expect(conversation.getByText('Where would you like to go?')).toBeVisible();
  const composer = conversation.getByRole('form', { name: 'Continue trip' });
  const composerBeam = composer.locator('xpath=ancestor::*[@data-wayfare-composer-beam="true"]');
  const layout = await composerBeam.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottomSafeArea: window.innerHeight - bounds.bottom,
      position: getComputedStyle(element).position,
    };
  });

  expect(layout.position).toBe('sticky');
  expect(layout.bottomSafeArea).toBeGreaterThanOrEqual(0);
  expect(layout.bottomSafeArea).toBeLessThanOrEqual(48);
});

test('keeps terminal errors bounded in the stable lower chrome row', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await page.route('**/v1/assistant/public-sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'browser-fixture-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        endpoints: {
          turns: 'http://127.0.0.1:3108/browser-fixture/terminal-error',
          toolConfirmations: 'http://127.0.0.1:3108/browser-fixture/confirmations',
        },
      }),
    });
  });
  await page.route('**/browser-fixture/terminal-error', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'deterministic_browser_fixture' }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Ask the travel assistant' })
    .fill('Islamabad to Rome for two, next weekend');
  await page.getByRole('button', { name: 'Submit trip request' }).click();

  const conversation = page.getByRole('region', { name: 'Travel conversation' });
  await expect(conversation.getByRole('alert')).toBeVisible();
  await expect(conversation.getByRole('region', { name: 'Current trip' }))
    .toHaveCount(0);
  const layout = await conversation.evaluate((element) => {
    const children = Array.from(element.children) as HTMLElement[];
    const transcript = children[2]!;
    const lowerChrome = children[3]!;
    const composer = children[4]!;
    const transcriptBounds = transcript.getBoundingClientRect();
    const lowerBounds = lowerChrome.getBoundingClientRect();
    const composerBounds = composer.getBoundingClientRect();
    const status = transcript.querySelector<HTMLElement>('[role="status"]')!;
    return {
      childCount: children.length,
      areas: children.map((child) => getComputedStyle(child).gridArea),
      transcriptHeight: transcriptBounds.height,
      lowerHeight: lowerBounds.height,
      statusHeight: status.getBoundingClientRect().height,
      transcriptToChrome: lowerBounds.top - transcriptBounds.bottom,
      chromeToComposer: composerBounds.top - lowerBounds.bottom,
      composerBottom: composerBounds.bottom,
      viewportHeight: window.innerHeight,
    };
  });
  expect(layout.childCount).toBe(5);
  expect(layout.areas).toEqual([
    'header',
    'context',
    'transcript',
    'lower-chrome',
    'composer',
  ]);
  expect(layout.transcriptHeight).toBeGreaterThan(80);
  expect(layout.lowerHeight).toBeLessThanOrEqual(160);
  expect(layout.statusHeight).toBeLessThanOrEqual(32);
  expect(layout.transcriptToChrome).toBeGreaterThanOrEqual(0);
  expect(layout.transcriptToChrome).toBeLessThanOrEqual(16);
  expect(layout.chromeToComposer).toBeGreaterThanOrEqual(0);
  expect(layout.chromeToComposer).toBeLessThanOrEqual(16);
  expect(layout.composerBottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
