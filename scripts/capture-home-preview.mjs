import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Start the local website separately; never point this capture at a deployment.
const target = new URL(process.argv[2] ?? 'http://127.0.0.1:3317/');
if (target.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(target.hostname)
  || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
  throw new Error('home_preview_requires_plain_loopback_origin');
}
const directory = resolve(process.cwd(), 'docs/images');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 800 }, deviceScaleFactor: 1,
    colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-CA', timezoneId: 'UTC',
  });
  const external = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === target.origin) return route.continue();
    external.push(url.origin); // Never retain query strings or credentials.
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('page_error'));
  await page.goto(target.href, { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'Ask the travel assistant' }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => image.decode().catch(() => undefined)));
  });
  // Next's development indicator is tooling chrome, not product content.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  if (errors.length || external.length) throw new Error('home_preview_unexpected_error_or_external_request');
  await page.screenshot({ path: resolve(directory, 'travel-home.png'), animations: 'disabled' });
  process.stdout.write(`${JSON.stringify({ ok: true, data: {
    file: 'travel-home.png', width: 1440, height: 800,
    network: 'loopback-only', submittedMessages: 0, externalRequests: external.length, pageErrors: errors.length,
  } })}\n`);
  await context.close();
} finally {
  await browser.close();
}
