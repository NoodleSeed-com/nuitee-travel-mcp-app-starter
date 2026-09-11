import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => { await request.post('http://127.0.0.1:3313/__fixture/published'); });

test('published branding follows the saved public projection with no session on load', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your next good place.' })).toBeVisible();
  await expect(page.locator('.travel-header .travel-wordmark')).toContainText('North Star Travel');
  await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveAttribute('data-value', 'CAD');
  await expect(page.getByRole('link', { name: 'North Star Travel home' })).toBeVisible();
  const capabilities = page.getByRole('region', { name: 'North Star Travel capabilities' });
  await expect(capabilities.getByText('Flights', { exact: true })).toBeVisible();
  await expect(capabilities.getByText('Hotels', { exact: true })).toHaveCount(0);
  await expect(capabilities.getByText('Experiences', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Travel menu', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toContainText('North Star Travel');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  expect(requests.some(url => url.includes('/public-sessions') || url.includes('/preview/session'))).toBe(false);
  expect(await page.content()).not.toMatch(/Private fixture source|synthetic_secret_never_rendered/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('published-brand.png'), fullPage: true });
});

test('unpublished business cannot start the unrelated standalone assistant', async ({ page, request }) => {
  await request.post('http://127.0.0.1:3313/__fixture/unpublished');
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('has not launched');
  await expect(page.getByRole('textbox', { name: 'Ask the travel assistant' })).toBeDisabled();
  await expect(page.locator('.travel-header .travel-wordmark')).toContainText('Wayfare');
});

test('long released names and welcome text remain readable at 320px', async ({ page, request }) => {
  await request.post('http://127.0.0.1:3313/__fixture/long');
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  await expect(page.locator('#travel-home-title')).toContainText('Thoughtful travel');
  const geometry = await page.locator('#travel-home-title').evaluate(element => {
    const heading = element.getBoundingClientRect();
    const hero = element.closest('.travel-hero__experience')!.getBoundingClientRect();
    return { inside: heading.left >= hero.left && heading.right <= hero.right && heading.top >= hero.top && heading.bottom <= hero.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(geometry).toEqual({ inside: true, overflow: false });
});

test('private ticket becomes an HttpOnly cookie; fragments and private source text stay out of requests and HTML', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/studio-preview');
  await expect(page.getByRole('heading', { name: 'Open this preview from your studio' })).toBeVisible();
  await page.goto('/studio-preview#ticket=synthetic_preview_ticket_for_browser');
  // A fragment-only change needs a new document, as a real portal link opens.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Review your next good place.' })).toBeVisible();
  await expect(page.getByLabel('Private preview')).toContainText('Private preview');
  expect(new URL(page.url()).hash).toBe('');
  expect(requests.every(url => !url.includes('ticket='))).toBe(true);
  const cookie = (await context.cookies()).find(value => value.name === 'wayfare_preview_3310');
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('wayfare_preview');
  expect(await page.content()).not.toMatch(/synthetic_preview_cookie|Private fixture source|synthetic_secret_never_rendered/);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.screenshot({ path: test.info().outputPath('private-preview.png'), fullPage: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find your next good place.' })).toBeVisible();
});
