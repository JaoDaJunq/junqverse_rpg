import { expect, test } from '@playwright/test';

test('technical defeat flow retries and returns without leaking the scene', async ({ page }) => {
  await page.goto('/?debugDefeat=1');

  const canvas = page.locator('canvas');
  const panel = page.locator('[data-testid="defeat-panel"]');

  await expect(canvas).toBeVisible();
  await expect(panel).toBeHidden();

  await canvas.click({ position: { x: 120, y: 120 } });
  await page.keyboard.press('k');

  await expect(panel).toBeVisible();
  await expect(page.locator('[data-testid="defeat-try-again"]')).toBeFocused();

  await page.locator('[data-testid="defeat-try-again"]').click();
  await expect(panel).toBeHidden();
  await expect(canvas).toHaveCount(1);

  await page.keyboard.press('k');
  await expect(panel).toBeVisible();

  await page.locator('[data-testid="defeat-return"]').click();

  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[data-testid="defeat-panel"]')).toBeHidden();
});
