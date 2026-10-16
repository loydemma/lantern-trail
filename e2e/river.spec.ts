import { test, expect, type Page } from '@playwright/test'

const tokens = (page: Page) => page.locator('[data-readout="tokens"]')

async function openRiver(page: Page) {
  await page.goto('/')
  await page.locator('#river').scrollIntoViewIfNeeded()
  await expect(page.locator('#river-sentence')).toContainText('The traveler lifted the lantern and')
}

test('stepping grows the sentence', async ({ page }) => {
  await openRiver(page)
  for (let i = 1; i <= 3; i++) {
    await expect(page.locator('#river-step')).toBeEnabled({ timeout: 10_000 })
    await page.locator('#river-step').click()
    await expect(tokens(page)).toHaveText(String(i), { timeout: 10_000 })
  }
  const text = await page.locator('#river-sentence').textContent()
  expect(text!.length).toBeGreaterThan('The traveler lifted the lantern and'.length)
})

test('rapid clicks do not skip', async ({ page }) => {
  await openRiver(page)
  await page.evaluate(() => {
    const b = document.getElementById('river-step') as HTMLButtonElement
    for (let i = 0; i < 5; i++) b.click()
  })
  await expect(page.locator('#river-step')).toBeEnabled({ timeout: 10_000 })
  await expect(tokens(page)).toHaveText('1')
})

test('mist changes the top-choice readout', async ({ page }) => {
  await openRiver(page)
  const setMist = (v: string) =>
    page.evaluate((val) => {
      const el = document.getElementById('river-mist') as HTMLInputElement
      el.value = val
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, v)
  const top = async () => parseFloat((await page.locator('[data-readout="topProb"]').textContent())!)
  await setMist('0.2')
  const sharp = await top()
  await setMist('2')
  const flat = await top()
  expect(flat).toBeLessThan(sharp)
})

test('reset restores the prompt', async ({ page }) => {
  await openRiver(page)
  await page.locator('#river-step').click()
  await expect(tokens(page)).toHaveText('1', { timeout: 10_000 })
  await page.locator('#river-reset').click()
  await expect(tokens(page)).toHaveText('0')
  await expect(page.locator('#river-sentence')).toHaveText('The traveler lifted the lantern and')
})

test('mobile: canvases let the page scroll vertically', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRiver(page)
  const ta = await page.locator('#river-canvas').evaluate((el) => getComputedStyle(el).touchAction)
  expect(ta).toBe('pan-y')
})
