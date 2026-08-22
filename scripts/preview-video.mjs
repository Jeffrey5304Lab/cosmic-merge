/**
 * 產生 App Preview 草稿影片（~20s）：主打 Novaborn 的獨特迴圈
 *   合併 → 做出太陽 → 兩顆太陽塌縮成全螢幕黑洞 → 誕生/發現一顆新恆星。
 *
 * 用 Playwright 錄下網頁版 gameplay（畫面與 iOS 原生一致），輸出 886×1920 webm
 * （App Preview 直向通用解析度）。最終上架建議在實機上重錄一次（Apple 偏好 on-device），
 * 但這支足以檢視分鏡/節奏，必要時也可先當草稿。
 *
 * 用法：先 `npm run dev`，再 `GAME_URL=http://localhost:5173 node scripts/preview-video.mjs`
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import { mkdirSync, renameSync } from 'node:fs'

const globalRoot = execSync('npm root -g').toString().trim()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? `${globalRoot}/playwright`)

const URL = process.env.GAME_URL ?? 'http://localhost:5173'
const OUT_DIR = 'previews'
mkdirSync(OUT_DIR, { recursive: true })

const W = 886
const H = 1920

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))

// 乾淨起始：關教學、每日已領、未發現過恆星（Sun+Sun→黑洞）
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem('cosmic-merge:best', '0')
  localStorage.setItem('cosmic-merge:stars-discovered', '0')
  localStorage.setItem('cosmic-merge:tutorial-seen', '1')
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.setItem('cosmic-merge:daily', JSON.stringify({ lastClaim: key, streak: 1 }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)

const wait = ms => page.waitForTimeout(ms)
const drop = (x, ms = 780) => page.evaluate(bx => { window.game.aim(bx); window.game.drop() }, x).then(() => wait(ms))
const spawn = (t, x, y) => page.evaluate(([tt, xx, yy]) => window.game.debugSpawn(tt, xx, yy), [t, x, y])

// ── Beat 1（~7s）：真實投放 + 合成，展示手感 ──
await wait(800)
for (const x of [230, 150, 310, 200, 260, 180, 300, 230]) await drop(x)

// ── Beat 2（~4s）：做出一顆太陽（兩顆木星合成，號角）──
await wait(400)
spawn(9, 205, 250)
spawn(9, 250, 250)
await wait(3200)

// ── Beat 3（~4s）：兩顆太陽塌縮成全螢幕黑洞（招牌一刻）──
spawn(10, 210, 470)
spawn(10, 250, 470)
await wait(3400) // 黑洞過場約 2.7s，多留一點看完整

// ── Beat 4（~5s）：誕生/發現新恆星 → 切 STARS 圖鑑展示 ──
await wait(1400) // 讓「New star discovered」橫幅出現
await page.evaluate(() => document.getElementById('tab-stars')?.click())
await wait(2600)
await page.evaluate(() => document.getElementById('tab-evolution')?.click())
await wait(700)

await ctx.close() // 關閉後影片才 flush 完成
const src = await page.video().path().catch(() => null)
await browser.close()

if (src) {
  const dest = `${OUT_DIR}/novaborn-preview.webm`
  renameSync(src, dest)
  console.log(`✓ 影片輸出：${dest}（${W}×${H}）`)
} else {
  console.log('⚠️ 取不到影片路徑')
}
if (errors.length) console.error('JS errors:\n' + errors.join('\n'))
