import { expect, test } from '@playwright/test';

test('renders the guest shell without opening an assistant session', async ({
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
    name: 'Where would you like to go?',
  })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Skip to content' }))
    .toHaveAttribute('href', '#travel-canvas');
  expect(assistantRequests).toEqual([]);
});

test('keeps the shell keyboard-visible and motion-safe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  expect(await focused.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none'
      && Number.parseFloat(style.outlineWidth) > 0;
  })).toBe(true);
  await expect(page.locator('.route-assistant-mark'))
    .toHaveCSS('animation-name', 'none');

  const undersizedControls = await page.locator(
    '.travel-workspace button, .travel-workspace a',
  ).evaluateAll(
    (elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && (rect.width < 44 || rect.height < 44);
      })
      .map((element) => element.getAttribute('aria-label')
        || element.textContent?.trim()
        || element.tagName),
  );
  expect(undersizedControls).toEqual([]);
});

test('fits the 390px mobile shell and 200 percent text zoom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('/');

  expect(await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ innerWidth: 390, scrollWidth: 390 });
  await expect(page.getByRole('complementary', { name: 'Trip context' }))
    .toHaveCSS('position', 'sticky');

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(await page.evaluate(() => {
    const composer = document.querySelector('.travel-composer');
    if (!composer) return false;
    const bounds = composer.getBoundingClientRect();
    return document.documentElement.scrollWidth === window.innerWidth
      && bounds.left >= 0
      && bounds.right <= window.innerWidth;
  })).toBe(true);
});
