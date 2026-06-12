/**
 * 開發驗收用：載入遊戲、模擬投放數顆星球、輸出截圖。
 * 用法：node scripts/screenshot.mjs（需要全域安裝 playwright，或 PLAYWRIGHT_PATH 指定）
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const globalRoot = execSync('npm root -g').toString().trim()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? `${globalRoot}/playwright`)

const URL = process.env.GAME_URL ?? 'http://localhost:5187'
const browser = await chromium.launch()

// 桌面版
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: 'screenshots/desktop-initial.png' })

// 鍵盤操作也要能玩：← → 瞄準 + 空白鍵投放
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('ArrowLeft')
await page.keyboard.press('Space')
await page.waitForTimeout(600)

// 模擬投放：固定幾個 x 位置連丟 10 顆，盡量觸發合成
const canvas = page.locator('#game')
const box = await canvas.boundingBox()
const xs = [0.5, 0.5, 0.3, 0.3, 0.7, 0.7, 0.5, 0.4, 0.6, 0.5]
for (const fx of xs) {
  await canvas.click({ position: { x: box.width * fx, y: box.height * 0.5 } })
  await page.waitForTimeout(700)
}
await page.waitForTimeout(1500)
await page.screenshot({ path: 'screenshots/desktop-playing.png' })

const score = await page.locator('#score').textContent()
console.log(`desktop score after 10 drops: ${score}`)

// 手機直向（中文 locale，驗證 i18n 偵測）
const zhContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'zh-TW',
})
const mobile = await zhContext.newPage()
mobile.on('pageerror', e => errors.push(`mobile pageerror: ${e.message}`))
await mobile.goto(URL, { waitUntil: 'networkidle' })
await mobile.waitForTimeout(800)
await mobile.screenshot({ path: 'screenshots/mobile-initial.png' })

const zhLabel = await mobile.locator('#label-score').textContent()
if (zhLabel !== '分數') errors.push(`zh-TW locale should show 分數, got: ${zhLabel}`)

await browser.close()

if (errors.length) {
  console.error('JS errors detected:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('OK — no JS errors, screenshots saved to screenshots/')
