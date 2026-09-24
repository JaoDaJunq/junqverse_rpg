import { expect, test } from '@playwright/test';

test('minimal JUNQVERSE page renders through preview', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('JUNQVERSE: Ecos do Vale');
  await expect(page.locator('canvas')).toBeVisible();
});


for (const size of [
  { width: 960, height: 540 },
  { width: 1280, height: 720 }
]) {
  test(`combat HUD canvas remains usable at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
  });
}
