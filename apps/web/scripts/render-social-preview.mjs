import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, '..');
const outputPath = resolve(webRoot, 'app/opengraph-image.png');

const fontPath = require.resolve(
  '@fontsource-variable/host-grotesk/files/host-grotesk-latin-wght-normal.woff2',
);
const [font, view, cabin, mark] = await Promise.all([
  readFile(fontPath),
  readFile(resolve(webRoot, 'public/images/immersive/wayfare-window-view-v1.png')),
  readFile(resolve(webRoot, 'public/images/immersive/wayfare-cabin-frame-v1.png')),
  readFile(resolve(webRoot, 'app/icon.svg')),
]);

const dataUrl = (mime, bytes) => (
  `data:${mime};base64,${bytes.toString('base64')}`
);
const fontUrl = dataUrl('font/woff2', font);
const viewUrl = dataUrl('image/png', view);
const cabinUrl = dataUrl('image/png', cabin);
const markUrl = dataUrl('image/svg+xml', mark);

const html = `<!doctype html>
<html lang="en">
  <head>
    <style>
      @font-face {
        font-family: 'Host Grotesk';
        src: url('${fontUrl}') format('woff2');
        font-style: normal;
        font-weight: 300 800;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: 1200px;
        height: 630px;
        overflow: hidden;
      }
      body {
        background: #ffffff;
        color: #0d0d0d;
        font-family: 'Host Grotesk', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main {
        display: grid;
        grid-template-columns: 44% 56%;
        width: 100%;
        height: 100%;
        padding: 48px;
        gap: 36px;
      }
      .copy {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 30px;
        font-weight: 600;
      }
      .brand img { width: 58px; height: 58px; }
      .message { max-width: 455px; padding-bottom: 26px; }
      h1 {
        margin: 0;
        font-size: 64px;
        line-height: 0.98;
        letter-spacing: -0.045em;
        font-weight: 560;
      }
      p {
        margin: 30px 0 0;
        color: #5d5d5d;
        font-size: 25px;
        line-height: 1.25;
        font-weight: 400;
      }
      .photo {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 40px;
        background: #0d0d0d;
      }
      .photo img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="copy">
        <div class="brand">
          <img src="${markUrl}" alt="">
          <span>Wayfare</span>
        </div>
        <div class="message">
          <h1>One conversation.<br>The whole journey.</h1>
          <p>Plan your trip in one conversation.</p>
        </div>
      </section>
      <div class="photo">
        <img src="${viewUrl}" alt="">
        <img src="${cabinUrl}" alt="">
      </div>
    </main>
  </body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => (
      image.complete
        ? Promise.resolve()
        : new Promise((resolveImage, rejectImage) => {
            image.addEventListener('load', resolveImage, { once: true });
            image.addEventListener('error', rejectImage, { once: true });
          })
    )));
  });
  await page.screenshot({ path: outputPath, type: 'png' });
} finally {
  await browser.close();
}

console.log(`Rendered ${outputPath}`);
