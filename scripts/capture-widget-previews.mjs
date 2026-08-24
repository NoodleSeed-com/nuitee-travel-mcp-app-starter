import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = process.cwd();
const outputDirectory = resolve(root, 'docs/images');
const noodleStyles = await readFile(resolve(root, 'node_modules/@noodleseed/one/react/styles.css'), 'utf8');
const travelStyles = await readFile(resolve(root, 'src/views/travel.css'), 'utf8');

const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true },
  // Bundle the published package's nested authoring runtime with the app so
  // Vite deduplicates React during server-rendered preview capture.
  ssr: { noExternal: ['@noodleseed/one', '@noodle-borg/authoring'] },
});

let browser;
try {
  const { renderWidgetPreview } = await vite.ssrLoadModule('/scripts/widget-preview-page.tsx');
  await mkdir(outputDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    viewport: { width: 820, height: 900 },
  });
  await context.route('**/*', (route) => route.abort());
  const page = await context.newPage();

  for (const preview of [
    { name: 'home', file: 'travel-home.png' },
    { name: 'results', file: 'flight-results.png' },
  ]) {
    const markup = renderWidgetPreview(preview.name);
    const unsafeMarkup = /(?:https?:\/\/|sel_[a-f0-9]|api[_-]?key|client[_-]?secret|<img\b)/i.test(markup);
    const missingFixtureDisclosure = preview.name === 'results' && !markup.includes('Fictional fixture fare; not live inventory.');
    const missingFutureBoundary = preview.name === 'home' && !markup.includes('Coming soon');
    if (unsafeMarkup || missingFixtureDisclosure || missingFutureBoundary) {
      throw new Error('widget_preview_safety_check_failed');
    }
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      ${noodleStyles}
      ${travelStyles}
      html { background: #f7f7f6; }
      body { margin: 0; padding: 24px; }
      #preview { width: 720px; max-width: 100%; }
    </style></head><body><main id="preview">${markup}</main></body></html>`);
    await page.locator('.cc-app').screenshot({
      path: resolve(outputDirectory, preview.file),
      animations: 'disabled',
    });
  }

  await context.close();
} finally {
  await browser?.close();
  await vite.close();
}

process.stdout.write(`${JSON.stringify({ ok: true, data: { previews: 2, network: 'blocked' } })}\n`);
