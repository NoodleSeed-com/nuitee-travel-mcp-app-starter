import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectStablePress(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const before = await control.boundingBox();
  expect(before).not.toBeNull();
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  const transform = await control.evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.down();
  try {
    expect(await control.evaluate((element) => element.matches(':active')),
      await control.evaluate((element) => element.outerHTML)).toBe(true);
    // Sample both the press and the settled transition, which used to replace
    // anchored controls' translate transform with a global scale transform.
    for (const delay of [0, 200]) {
      if (delay) await page.waitForTimeout(delay);
      expect(await control.evaluate((element) => getComputedStyle(element).transform)).toBe(transform);
      const during = await control.boundingBox();
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(during![key]).toBeCloseTo(before![key], 1);
      }
    }
  } finally {
    // Release off the target so inspecting a press does not navigate or submit.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`product controls stay fixed on press (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const controls = page.locator('.travel-workspace button:visible:not(:disabled), .travel-wordmark:visible');
    expect(await controls.count()).toBeGreaterThanOrEqual(3);
    for (const control of await controls.all()) {
      await expectStablePress(page, control);
    }
  });

  test(`MCP positioned controls preserve their anchors on press (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const css = await readFile(new URL('../../../../src/views/travel.css', import.meta.url), 'utf8');
    await page.setContent(`
      <!doctype html>
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
      <main class="cc-app" style="padding:60px">
        <button type="button">Select stay</button>
        <div class="cc-rail-outer" style="height:200px;margin-top:40px">
          <button class="cc-rail-arrow cc-rail-arrow-next" style="display:grid" type="button">Next</button>
        </div>
        <div class="cc-map-board" style="height:200px">
          <button class="cc-map-pin" style="left:50%;top:60%" type="button">$200</button>
        </div>
      </main>
      </body></html>
    `);
    await page.addStyleTag({ content: css });
    for (const control of await page.locator('button').all()) {
      await expectStablePress(page, control);
    }
    const pin = page.locator('.cc-map-pin');
    const beforeSelection = await pin.boundingBox();
    await pin.evaluate((element) => element.setAttribute('data-active', 'true'));
    expect(await pin.boundingBox()).toEqual(beforeSelection);
  });
}
