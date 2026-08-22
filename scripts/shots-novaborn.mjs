/**
 * 產生 Novaborn 的 App Store 截圖（改名後，頂端標題顯示 Novaborn；主打「成長 + 黑洞終局」）。
 * 兩種尺寸：6.9"（1320×2868）與 6.5"（1242×2688）。headless Chromium 會正常跑物理。
 *
 * 用法：先 `npm run dev`（DEV build 才有 window.game），再
 *   GAME_URL=http://localhost:5173 node scripts/shots-novaborn.mjs
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

async function freshLoad(page) {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('cosmic-merge:best', '0')
    localStorage.setItem('cosmic-merge:stars-discovered', '0') // Sun+Sun → 黑洞（未發現過恆星）
    localStorage.setItem('cosmic-merge:tutorial-seen', '1') // 收起新手教學泡泡
    // 把每日獎勵標記為「今天已領」→ 每日彈窗不會出現（避免蓋住畫面 + 領取吐司）
    const d = new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('cosmic-merge:daily', JSON.stringify({ lastClaim: key, streak: 1 }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
}

for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`[${s.dir}] pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${s.dir}] console.error: ${m.text()}`)
  })

  // ── 截圖 A：成長中的盤面（不同階級不會合，畫面乾淨，頂端顯示 Novaborn）──
  await freshLoad(page)
  await page.evaluate(() => {
    const g = window.game
    const layout = [[1, 90, 600], [3, 165, 600], [5, 255, 600], [8, 340, 600], [2, 200, 470]]
    for (const [t, x, y] of layout) g.debugSpawn(t, x, y)
  })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${s.dir}/novaborn-play.png` })

  // ── 截圖 B：黑洞終局（兩顆太陽相撞塌縮成全螢幕黑洞）──
  await freshLoad(page)
  await page.evaluate(() => {
    const g = window.game
    // 兩顆太陽（tier 10）大幅重疊 → 立即相撞合成 → 觸發黑洞過場（2.7s）
    g.debugSpawn(10, 215, 500)
    g.debugSpawn(10, 245, 500)
  })
  await page.waitForTimeout(1300) // 過場約 1.3s 處：全螢幕黑洞最戲劇的一刻
  const inBH = await page.evaluate(() => !!window.game?.inBlackHole)
  if (!inBH) errors.push(`[${s.dir}] 黑洞未觸發（截圖 B 可能不理想）`)
  await page.screenshot({ path: `${s.dir}/novaborn-blackhole.png` })

  await ctx.close()
  console.log(`✓ ${s.dir}: novaborn-play.png + novaborn-blackhole.png (blackHole=${inBH})`)
}

await browser.close()

if (errors.length) {
  console.error('JS errors / warnings:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('OK — Novaborn screenshots saved.')
