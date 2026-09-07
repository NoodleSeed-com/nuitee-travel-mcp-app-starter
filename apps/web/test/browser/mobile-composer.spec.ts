import { expect, test } from '@playwright/test';

for (const width of [320, 390, 767]) {
  for (const route of ['/', '/experience/chat']) {
    test(`compact composer at ${width}px on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(route);
      const input = page.getByRole('textbox', { name: 'Ask the travel assistant' });
      await expect(input).toBeVisible();
      const form = page.locator('.travel-composer').first();
      const send = form.locator('button[type="submit"]');
      const inputBox = (await input.boundingBox())!;
      const sendBox = (await send.boundingBox())!;
      expect(Math.abs(inputBox.y - sendBox.y)).toBeLessThan(12);
      expect((await form.boundingBox())!.height).toBeLessThan(85);
      expect(sendBox.width).toBeGreaterThanOrEqual(44);
      expect(sendBox.height).toBeGreaterThanOrEqual(44);
      expect(sendBox.x + sendBox.width).toBeLessThanOrEqual(width);
      await input.fill('Flights to Lisbon');
      await expect(send).toBeEnabled();
    });
  }
}
