import { expect, test } from '@playwright/test'

test('anonymous user can open public homepage', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('A personal fragrance diary with intelligent preference updates')).toBeVisible()
})

test('anonymous user is redirected to login from diary route', async ({ page }) => {
  await page.goto('/diary')
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdiary/)
})
