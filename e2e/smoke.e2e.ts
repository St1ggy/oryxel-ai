import { expect, test } from '@playwright/test'

test('home page renders brand', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Oryxel' }).first()).toBeVisible()
})
