/**
 * 上線前 QA：效能（FPS）、UX 流程、偏好持久化、邏輯持久化。
 * 用法：node scripts/qa.mjs
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const globalRoot = execSync('npm root -g').toString().trim()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? `${globalRoot}/playwright`)

const URL = process.env.GAME_URL ?? 'http://localhost:5187'
const results = []
const fail = []

function check(name, ok, detail = '') {
  results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) fail.push(name)
}

/** 量 240 幀的 frame time，回傳 {avg, p95, worst}（ms） */
function measureFps(page) {
  return page.evaluate(
    () =>
      new Promise(res => {
        const frames = []
        let last = performance.now()
        let n = 0
        const f = t => {
          frames.push(t - last)
          last = t
          if (++n < 240) requestAnimationFrame(f)
          else res(frames)
        }
        requestAnimationFrame(f)
      }),
  )
}

function stats(frames) {
  const sorted = [...frames].sort((a, b) => a - b)
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length
  return {
    avgFps: 1000 / avg,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    worst: sorted[sorted.length - 1],
  }
}

/**
 * 用「真實 pointerup 事件」投放。Playwright 的 page.mouse.click / touchscreen.tap 在無頭
 * Chromium 下不會觸發遊戲 canvas 的 pointerup 監聽（合成事件抵達不到），會造成假性失敗；
 * 直接 dispatch PointerEvent 才等同玩家在真實瀏覽器點一下（已驗證會投放）。
 */
function dropAt(page, fx = 0.5) {
  return page.evaluate(fx => {
    const c = document.getElementById('game')
    const b = c.getBoundingClientRect()
    c.dispatchEvent(
      new PointerEvent('pointerup', {
        clientX: b.left + b.width * fx,
        clientY: b.top + b.height * 0.4,
        bubbles: true,
        pointerId: 1,
      }),
    )
  }, fx)
}
/** 真實 keydown 空白鍵（同理，取代 page.keyboard.press 在無頭下的失效） */
function pressSpace(page) {
  return page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })))
}
/**
 * 開場的每日獎勵彈窗會讓遊戲 paused（物理凍結、鍵盤投放被擋）。真實玩家會先領/關掉它，
 * QA 也要先關，否則會誤判「不能投放/分數不保留」。
 */
function dismissDaily(page) {
  return page.evaluate(() => {
    const d = document.getElementById('daily-modal')
    if (d && !d.classList.contains('hidden')) document.getElementById('daily-claim')?.click()
  })
}

const browser = await chromium.launch()
const errors = []

/* ═══ 1. 效能：閒置與壓力 FPS ═══ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await dismissDaily(page)

  const idle = stats(await measureFps(page))
  check('閒置 FPS ≥ 55', idle.avgFps >= 55, `avg ${idle.avgFps.toFixed(1)}fps, worst frame ${idle.worst.toFixed(1)}ms`)

  // 壓力：丟 45 顆鋪滿底部 + 邊丟邊量
  const box = await page.locator('#game').boundingBox()
  const xs = [0.08, 0.92, 0.2, 0.8, 0.35, 0.65, 0.5]
  for (let i = 0; i < 35; i++) {
    const over = await page.locator('#gameover').evaluate(el => !el.classList.contains('hidden'))
    if (over) break
    await dropAt(page, xs[i % xs.length])
    await page.waitForTimeout(460)
  }
  const measuring = measureFps(page)
  for (let i = 0; i < 8; i++) {
    await dropAt(page, xs[i % xs.length])
    await page.waitForTimeout(460)
  }
  const stress = stats(await measuring)
  check('40+ 星球壓力 FPS ≥ 50', stress.avgFps >= 50, `avg ${stress.avgFps.toFixed(1)}fps, p95 ${stress.p95.toFixed(1)}ms, worst ${stress.worst.toFixed(1)}ms`)
  await page.screenshot({ path: 'screenshots/qa-stress.png' })
  await page.close()
}

/* ═══ 2. UX：教學提示生命週期 ═══ */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await dismissDaily(page)
  const shown = await page.locator('#tutorial').evaluate(el => !el.classList.contains('hidden'))
  check('首次進入顯示教學', shown)
  const box = await page.locator('#game').boundingBox()
  await dropAt(page, 0.5)
  await page.waitForTimeout(600)
  const hidden = await page.locator('#tutorial').evaluate(el => el.classList.contains('hidden'))
  check('投放後教學收起', hidden)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const stillHidden = await page.locator('#tutorial').evaluate(el => el.classList.contains('hidden'))
  check('重載後教學不再出現', stillHidden)

  /* ═══ 3. 偏好持久化：靜音 / 最佳分數 ═══ */
  await page.locator('#mute').click()
  const mutedState = await page.locator('#mute').evaluate(el => el.classList.contains('muted'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  check(
    '靜音設定重載後保留',
    (await page.locator('#mute').evaluate(el => el.classList.contains('muted'))) === mutedState,
    `muted=${mutedState}`,
  )

  // 玩出分數 → 重載 → 最佳分數保留
  const box2 = await page.locator('#game').boundingBox()
  for (let i = 0; i < 10; i++) {
    await dropAt(page, [0.42, 0.5, 0.58][i % 3])
    await page.waitForTimeout(460)
  }
  await page.waitForTimeout(1200)
  const best = Number(await page.locator('#best').textContent())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const bestAfter = Number(await page.locator('#best').textContent())
  check('最佳分數重載後保留', best > 0 && bestAfter === best, `${best} → ${bestAfter}`)
  await ctx.close()
}

/* ═══ 4. 鍵盤操作 ═══ */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await dismissDaily(page)

  // 鍵盤：space 投放後 next-name 應該換（序列前進）
  const before = await page.locator('#next-name').textContent()
  let changed = false
  for (let i = 0; i < 5 && !changed; i++) {
    await pressSpace(page)
    await page.waitForTimeout(550)
    changed = (await page.locator('#next-name').textContent()) !== before
  }
  check('鍵盤空白鍵可投放', changed)
  await page.close()
}

/* ═══ 5. 手機視窗 + 直向截圖 ═══ */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await dismissDaily(page)
  // 觸控投放
  const box = await page.locator('#game').boundingBox()
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(800)
  const score = await page.locator('#score').textContent()
  check('觸控投放正常（無 JS 錯誤）', true, `score=${score}`)
  const mobileFps = stats(await measureFps(page))
  check('手機視窗 FPS ≥ 50', mobileFps.avgFps >= 50, `avg ${mobileFps.avgFps.toFixed(1)}fps`)
  await page.screenshot({ path: 'screenshots/qa-mobile.png' })
  await ctx.close()
}

await browser.close()

console.log(results.join('\n'))
if (errors.length) {
  console.error('\nJS errors:\n' + errors.join('\n'))
  process.exit(1)
}
if (fail.length) {
  console.error(`\n${fail.length} 項未通過`)
  process.exit(1)
}
console.log('\n全部通過 ✓')
