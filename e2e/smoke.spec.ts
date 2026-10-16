import { test, expect } from '@playwright/test'

test('page loads hero and river copy', async ({ page }) => {
  await page.goto('/')
  const h1 = page.locator('h1')
  await expect(h1).toContainText('Lantern')
  await expect(h1).toContainText('Trail')
  await expect(page.getByText('It predicts', { exact: false }).first()).toBeVisible()
})

test('no horizontal scroll on phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(390)
})

test('no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.waitForTimeout(1500)
  expect(errors).toEqual([])
})
