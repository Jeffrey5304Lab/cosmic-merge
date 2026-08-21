/**
 * 產生「星座任務」為主軸的 App Store 截圖（因應 4.3(a)，讓商店頁一眼就與通用 merge 遊戲區隔）。
 * 兩種尺寸：6.9"（1320×2868）與 6.5"（1242×2688）。用 DEV hook（window.game / window.__cons）
 * 佈置畫面，headless Chromium 會正常跑物理（不像前景分頁被節流）。
 *
 * 用法：先 `npm run dev`（DEV build 才有 window.__cons），再
 *   GAME_URL=http://localhost:5173 node scripts/shots-constellation.mjs
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const globalRoot = execSync('npm root -g').toString().trim()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? `${globalRoot}/playwright`)

const URL = process.env.GAME_URL ?? 'http://localhost:5173'
const SIZES = [
  { dir: 'screenshots/appstore-6.9', w: 440, h: 956, scale: 3 }, // → 1320×2868
  { dir: 'screenshots/appstore-6.5', w: 414, h: 896, scale: 3 }, // → 1242×2688
]

const browser = await chromium.launch()
const errors = []

async function dismissDaily(page) {
  await page.evaluate(() => {
    const d = document.getElementById('daily-modal')
    if (d && !d.classList.contains('hidden')) document.getElementById('daily-claim')?.click()
  })
}

for (const s of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: s.scale,
  })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`[${s.dir}] pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${s.dir}] console.error: ${m.text()}`)
  })

  // 落定一排「不同階級」的可愛星球當背景（不同階級不會合成→不觸發 combo/成就吐司/完成橫幅）
  const settleBoard = async p =>
    p.evaluate(() => {
      const g = window.game
      const layout = [[1, 90, 600], [3, 165, 600], [5, 255, 600], [8, 340, 600], [2, 200, 470]]
      for (const [t, x, y] of layout) g.debugSpawn(t, x, y)
    })

  // ── 截圖 A：遊戲進行中 + 頂端星座列點亮中（Triangulum 起手，2/3）──
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('cosmic-merge:constellations-done', '0')
    localStorage.setItem('cosmic-merge:best', '0')
    localStorage.setItem('cosmic-merge:tutorial-seen', '1') // 收起新手教學泡泡，畫面乾淨
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await dismissDaily(page)
  await settleBoard(page)
  await page.waitForTimeout(2000)
  // 點亮星座列前兩顆星（__cons 不會產生 combo/吐司，畫面不亂）
  await page.evaluate(() => {
    window.__cons.merge(3)
    window.__cons.merge(4)
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${s.dir}/constellations-play.png` })

  // ── 截圖 B：SKY 星圖階梯（完成／進行中／未解鎖一目了然）──
  await page.evaluate(() => {
    localStorage.setItem('cosmic-merge:constellations-done', '3') // 已完成前三座，目前 Cygnus
    localStorage.setItem('cosmic-merge:tutorial-seen', '1')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await dismissDaily(page)
  await settleBoard(page)
  await page.waitForTimeout(1800)
  await page.evaluate(() => {
    // 目前星座（Cygnus）先點亮兩顆星，讓「進行中」那格有真實進度
    window.__cons.merge(5)
    window.__cons.merge(6)
    document.getElementById('tab-sky').click()
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${s.dir}/constellations-sky.png` })

  // 還原乾淨狀態
  await page.evaluate(() => localStorage.setItem('cosmic-merge:constellations-done', '0'))
  await ctx.close()
  console.log(`✓ ${s.dir}: constellations-play.png + constellations-sky.png`)
}

await browser.close()

if (errors.length) {
  console.error('JS errors detected:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('OK — constellation screenshots saved.')
