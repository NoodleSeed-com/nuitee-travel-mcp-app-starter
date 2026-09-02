import { expect, test } from '@playwright/test';

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

test('disables decorative animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/experience');

  const animationName = await page.locator('[class*="imageSkeleton"]')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe('none');
});
