/**
 * 產生 og:image（1200×630）：社群分享連結時的預覽圖。
 * 用法：node scripts/og-image.mjs（dev server 需在 5187）
 */
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'

const globalRoot = execSync('npm root -g').toString().trim()
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? `${globalRoot}/playwright`)

const URL = process.env.GAME_URL ?? 'http://localhost:5187'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  const { TIERS } = await import('/src/planets.ts')
  const { drawPlanet } = await import('/src/render.ts')
  await document.fonts.ready

  const W = 1200
  const H = 630
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  c.id = 'og'
  c.style.cssText = 'position:fixed;inset:0;z-index:99'
  const g = c.getContext('2d')

  // 奶油紙底 + 顆粒
  g.fillStyle = '#F4E9D7'
  g.fillRect(0, 0, W, H)
  for (let i = 0; i < 1500; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(59,48,36,0.05)'
    g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }

  // 夜空帶（下半）
  g.beginPath()
  g.roundRect(40, 250, W - 80, H - 290, 26)
  g.fillStyle = '#414968'
  g.fill()
  g.strokeStyle = '#3B3024'
  g.lineWidth = 5
  g.stroke()
  g.save()
  g.beginPath()
  g.roundRect(40, 250, W - 80, H - 290, 26)
  g.clip()
  g.fillStyle = '#F6EAC9'
  for (let i = 0; i < 70; i++) {
    g.globalAlpha = 0.3 + Math.random() * 0.7
    g.beginPath()
    g.arc(40 + Math.random() * (W - 80), 250 + Math.random() * (H - 290), 1 + Math.random() * 1.5, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  // 一排星球（小→大）
  const order = [0, 1, 2, 3, 4, 5, 6, 8, 10]
  let x = 110
  for (const i of order) {
    const tier = TIERS[i]
    const r = 22 + i * 9
    drawPlanet(g, tier, x, 440, 0, r / tier.radius, i)
    x += r + 36 + i * 7
  }
  g.restore()

  // 標題
  g.textAlign = 'center'
  g.fillStyle = '#3B3024'
  g.font = "110px 'Gochi Hand', cursive"
  g.fillText('Cosmic Merge', W / 2, 145)
  g.font = "bold 38px 'Noto Sans TC', sans-serif"
  g.fillStyle = '#E07A5F'
  g.fillText('宇宙合併 — 把星球合到太陽！', W / 2, 215)

  document.body.appendChild(c)
})
await page.waitForTimeout(300)
await page.locator('#og').screenshot({ path: 'public/og-image.png' })
await browser.close()
console.log('public/og-image.png generated')
