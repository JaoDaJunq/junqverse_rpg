import { expect, test } from '@playwright/test';

test('minimal JUNQVERSE page renders through preview', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('JUNQVERSE: Ecos do Vale');
  await expect(page.locator('canvas')).toBeVisible();
});
