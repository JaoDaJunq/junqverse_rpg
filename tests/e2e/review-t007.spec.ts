import { expect, test } from '@playwright/test';

test('T007 playable prototype moves and pauses in the browser', async ({ page }) => {
  await page.goto('/');

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const initial = await canvas.screenshot();

  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');

  const moved = await canvas.screenshot();
  expect(Buffer.compare(initial, moved)).not.toBe(0);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);

  const pausedBefore = await canvas.screenshot();

  await page.keyboard.down('d');
  await page.waitForTimeout(300);
  await page.keyboard.up('d');

  const pausedAfter = await canvas.screenshot();
  expect(Buffer.compare(pausedBefore, pausedAfter)).toBe(0);

  await page.keyboard.press('Escape');
  await page.keyboard.down('s');
  await page.waitForTimeout(300);
  await page.keyboard.up('s');

  const resumed = await canvas.screenshot();
  expect(Buffer.compare(pausedAfter, resumed)).not.toBe(0);
});
