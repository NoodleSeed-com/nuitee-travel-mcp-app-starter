import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = process.cwd();
const outputDirectory = resolve(root, 'docs/images');
const styles = await Promise.all([
  'node_modules/@noodleseed/one/react/styles.css',
  'src/views/travel.css',
  'src/views/hotel-journey.css',
].map(file => readFile(resolve(root, file), 'utf8')));
const font = await readFile(resolve(root, 'node_modules/@fontsource-variable/host-grotesk/files/host-grotesk-latin-wght-normal.woff2'));

const vite = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  logLevel: 'error',
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { middlewareMode: true },
  define: { 'import.meta.env.VITE_MAPBOX_TOKEN': '""' },
  ssr: { noExternal: ['@noodleseed/one', '@noodle-borg/authoring'] },
});

let browser;
const captures = [];
try {
  const { renderWidgetPreview } = await vite.ssrLoadModule('/scripts/widget-preview-page.tsx');
  await mkdir(outputDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-CA',
    timezoneId: 'UTC',
    viewport: { width: 1160, height: 1000 },
    deviceScaleFactor: 1,
  });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();

  for (const preview of [
    { name: 'results', file: 'flight-results.png', disclosure: 'Fictional fixture fare; not live inventory.' },
    { name: 'hotels', file: 'hotel-results.png', disclosure: 'Fictional stays and prices for this preview.' },
  ]) {
    const markup = renderWidgetPreview(preview.name);
    // React-generated Heroicons use the standard SVG namespace. No other
    // remote URL, credential text, provider imagery, or selection handle may
    // appear in captured markup. Fixtures are in widget-preview-page.tsx.
    const withoutSvgNamespace = markup.replaceAll('http://www.w3.org/2000/svg', '');
    if (/(?:https?:\/\/|(?:h)?sel_[a-f0-9]{32}|api[_-]?key|client[_-]?secret|<img\b)/i.test(withoutSvgNamespace)
      || !markup.includes(preview.disclosure)) {
      throw new Error('widget_preview_safety_check_failed');
    }
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face {font-family:'Host Grotesk Variable';font-style:normal;font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');}
      ${styles.join('\n')}
      html { background: #ffffff; }
      body { margin: 0; padding: 24px; }
      #preview { width: 1080px; max-width: 100%; }
      .preview-disclosure {font: 14px/1.5 'Host Grotesk Variable', sans-serif; color: #5d5d5d; margin: 0 0 14px;}
    </style></head><body><main id="preview"><p class="preview-disclosure">Fictional preview · no live inventory or reservations</p>${markup}</main></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const widget = page.locator('#preview');
    await widget.screenshot({ path: resolve(outputDirectory, preview.file), animations: 'disabled' });
    const bounds = await widget.boundingBox();
    captures.push({ file: preview.file, width: Math.round(bounds.width), height: Math.ceil(bounds.height) });
  }
  await context.close();
} finally {
  await browser?.close();
  await vite.close();
}

process.stdout.write(`${JSON.stringify({ ok: true, data: { captures, network: 'blocked', fixtures: 'fictional' } })}\n`);
