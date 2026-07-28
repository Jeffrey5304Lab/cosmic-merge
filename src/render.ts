import type { PlanetTier } from './planets'
import { BOARD } from './planets'

/** 手繪墨色 */
const INK = '#3B3024'

/* ══════════════ 手繪基礎筆觸 ══════════════ */

/**
 * 抖動圓：用低頻正弦擾動半徑，模擬手繪的不完美邊線。
 * seed 固定（依星球階級），同一顆球每幀形狀一致不會抖動。
 */
function wobblyCirclePath(g: CanvasRenderingContext2D, r: number, seed: number) {
  const segments = 44
  g.beginPath()
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    const wobble = 1 + 0.022 * Math.sin(theta * 5 + seed) + 0.014 * Math.sin(theta * 3 + seed * 2.7)
    const pr = r * wobble
    const x = Math.cos(theta) * pr
    const y = Math.sin(theta) * pr
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
  g.closePath()
}

/* ══════════════ 背景：繪本夜空 ══════════════ */

export interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

export function makeStars(count: number, rng: () => number = Math.random): Star[] {
  return Array.from({ length: count }, () => ({
    x: rng() * BOARD.width,
    y: rng() * BOARD.height,
    r: 1 + rng() * 2.2,
    phase: rng() * Math.PI * 2,
    speed: 0.5 + rng() * 1.5,
  }))
}

/** 手繪四芒星 ✦ */
function drawSparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x, y, x + r, y)
  g.quadraticCurveTo(x, y, x, y + r)
  g.quadraticCurveTo(x, y, x - r, y)
  g.quadraticCurveTo(x, y, x, y - r)
  g.fill()
}

/** 水彩暈染色塊 */
function drawWatercolor(g: CanvasRenderingContext2D, time: number) {
  const blobs = [
    { x: 0.22, y: 0.28, r: 230, color: '139, 121, 184', drift: 0.7 }, // 藕紫
    { x: 0.82, y: 0.6, r: 210, color: '95, 143, 168', drift: 1.2 }, // 灰藍
    { x: 0.5, y: 0.88, r: 190, color: '201, 139, 139', drift: 0.9 }, // 豆沙紅
  ]
  for (const b of blobs) {
    const bx = b.x * BOARD.width + Math.sin(time * 0.05 * b.drift) * 24
    const by = b.y * BOARD.height + Math.cos(time * 0.04 * b.drift) * 20
    const grad = g.createRadialGradient(bx, by, b.r * 0.2, bx, by, b.r)
    grad.addColorStop(0, `rgba(${b.color}, 0.12)`)
    grad.addColorStop(0.8, `rgba(${b.color}, 0.05)`)
    grad.addColorStop(1, `rgba(${b.color}, 0)`)
    g.fillStyle = grad
    g.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2)
  }
}

/** 紙張顆粒（lazy 建一次 pattern） */
let grainPattern: CanvasPattern | null = null
function getGrain(g: CanvasRenderingContext2D): CanvasPattern | null {
  if (grainPattern || typeof document === 'undefined') return grainPattern
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const gg = c.getContext('2d')
  if (!gg) return null
  for (let i = 0; i < 320; i++) {
    gg.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
    gg.fillRect(Math.random() * 96, Math.random() * 96, 1, 1)
  }
  grainPattern = g.createPattern(c, 'repeat')
  return grainPattern
}

export function drawBackground(g: CanvasRenderingContext2D, stars: Star[], time: number) {
  // 暖調靛藍夜空（繪本水彩感）
  const grad = g.createLinearGradient(0, 0, 0, BOARD.height)
  grad.addColorStop(0, '#3D4466')
  grad.addColorStop(0.55, '#454E73')
  grad.addColorStop(1, '#4F578068')
  g.fillStyle = '#414968'
  g.fillRect(0, 0, BOARD.width, BOARD.height)
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.height)

  drawWatercolor(g, time)

  // 手繪星星：大顆畫四芒星、小顆畫點
  g.fillStyle = '#F6EAC9'
  for (const s of stars) {
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase))
    g.globalAlpha = tw
    if (s.r > 2.4) drawSparkle(g, s.x, s.y, s.r * 1.6)
    else {
      g.beginPath()
      g.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.globalAlpha = 1

  // 紙張顆粒疊在最上面，整張畫面帶紙感
  const grain = getGrain(g)
  if (grain) {
    g.globalAlpha = 0.07
    g.fillStyle = grain
    g.fillRect(0, 0, BOARD.width, BOARD.height)
    g.globalAlpha = 1
  }
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/** 偶爾劃過的手繪流星 */
export class ShootingStars {
  private meteors: Meteor[] = []
  private nextSpawn = 2

  update(dt: number, time: number) {
    if (time > this.nextSpawn) {
      this.nextSpawn = time + 5 + Math.random() * 7
      const fromLeft = Math.random() > 0.5
      this.meteors.push({
        x: fromLeft ? -20 : BOARD.width + 20,
        y: 20 + Math.random() * BOARD.height * 0.3,
        vx: (fromLeft ? 1 : -1) * (300 + Math.random() * 160),
        vy: 110 + Math.random() * 80,
        life: 0,
      })
    }
    for (const m of this.meteors) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.life += dt
    }
    this.meteors = this.meteors.filter(m => m.life < 2.5)
  }

  draw(g: CanvasRenderingContext2D) {
    for (const m of this.meteors) {
      const tail = 0.14
      g.strokeStyle = 'rgba(246, 234, 201, 0.8)'
      g.lineWidth = 2.5
      g.lineCap = 'round'
      g.setLineDash([7, 5]) // 虛線尾巴＝手繪速度線
      g.beginPath()
      g.moveTo(m.x, m.y)
      g.lineTo(m.x - m.vx * tail, m.y - m.vy * tail)
      g.stroke()
      g.setLineDash([])
      g.fillStyle = '#F6EAC9'
      drawSparkle(g, m.x, m.y, 5)
    }
  }
}

/* ══════════════ 警戒線 ══════════════ */

export function drawLoseLine(g: CanvasRenderingContext2D, time: number, danger: boolean) {
  const alpha = danger ? 0.55 + 0.45 * Math.sin(time * 8) : 0.3
  g.save()
  g.globalAlpha = alpha
  g.strokeStyle = danger ? '#E2705B' : '#B9AF99'
  g.setLineDash([12, 9])
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(0, BOARD.loseY)
  g.lineTo(BOARD.width, BOARD.loseY)
  g.stroke()
  g.restore()
}

/** 瀕死警示：暖紅水彩從頂端暈開 */
export function drawDangerVignette(g: CanvasRenderingContext2D, time: number, intensity: number) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 6)
  const grad = g.createLinearGradient(0, 0, 0, BOARD.loseY * 1.6)
  grad.addColorStop(0, `rgba(201, 84, 63, ${0.36 * intensity * pulse})`)
  grad.addColorStop(1, 'rgba(201, 84, 63, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.loseY * 1.6)
}

/* ══════════════ 黑洞（頂階恆星相撞後吞噬全場） ══════════════ */

/**
 * 黑洞過場的三段時間軸（秒）：
 *  0        → form      塌陷形成：視界彈出、吸積盤起轉
 *  form     → devourEnd 吞噬全場：暗幕籠罩、星光被拉成弧、集中線＋螺旋吸積流
 *  devourEnd→ total     終幕塌縮：黑洞縮回奇點、白閃、新恆星誕生
 * game.ts 的物理吞噬判定沿用同一組時間點。
 */
export const BH_PHASE = { form: 0.55, devourEnd: 1.95, total: 2.7 } as const

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInCubic = (t: number) => t * t * t

/** 黑洞各階段進度（0~1），視覺與物理共用同一套解算 */
export function bhProgress(t: number) {
  return {
    form: clamp01(t / BH_PHASE.form),
    devour: clamp01((t - BH_PHASE.form) / (BH_PHASE.devourEnd - BH_PHASE.form)),
    finale: clamp01((t - BH_PHASE.devourEnd) / (BH_PHASE.total - BH_PHASE.devourEnd)),
  }
}

/**
 * 全視窗黑洞吞噬：暗幕、重力透鏡星弧、漫畫集中線、螺旋吸積流、
 * 三環吸積盤＋光子環、手繪抖動邊線的事件視界。
 * 疊放於星球之後、粒子之前；終幕白閃見 drawSupernovaFlash（疊在最上層）。
 */
export function drawBlackHole(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  time: number,
  stars: Star[] = [],
) {
  const { form, devour, finale } = bhProgress(t)
  // 視界半徑：形成期彈出 → 吞噬期緩漲 → 終幕塌縮回奇點
  const rGrow = 30 * easeOutCubic(form) + 78 * easeOutCubic(devour)
  const r = Math.max(2, rGrow * (1 - easeInCubic(finale)))
  const intensity = Math.min(1, form * 0.6 + devour) * (1 - finale * finale)
  // 從黑洞中心到最遠角落的距離：暗幕與集中線要真正蓋滿全場
  const maxDist = Math.max(
    Math.hypot(x, y),
    Math.hypot(BOARD.width - x, y),
    Math.hypot(x, BOARD.height - y),
    Math.hypot(BOARD.width - x, BOARD.height - y),
  )

  // ── 1. 全畫面暗幕：邊緣最暗（世界的光被偷走），中心留給吸積盤的亮 ──
  const dark = 0.92 * intensity
  const veil = g.createRadialGradient(x, y, r * 1.4, x, y, maxDist)
  veil.addColorStop(0, `rgba(10, 6, 18, ${0.5 * dark})`)
  veil.addColorStop(0.6, `rgba(10, 6, 18, ${0.8 * dark})`)
  veil.addColorStop(1, `rgba(6, 3, 12, ${dark})`)
  g.fillStyle = veil
  g.fillRect(0, 0, BOARD.width, BOARD.height)

  // ── 2. 重力透鏡：背景星光被拉成繞行黑洞的弧線、緩緩被吸近 ──
  if (devour > 0.02) {
    g.save()
    g.lineCap = 'round'
    for (const s of stars) {
      const dx = s.x - x
      const dy = s.y - y
      const dist = Math.hypot(dx, dy)
      if (dist < r * 1.8) continue
      const ang = Math.atan2(dy, dx)
      const pulled = dist * (1 - 0.38 * easeOutCubic(devour))
      const sweep = devour * Math.min(1.1, 0.15 + 130 / dist)
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase))
      g.strokeStyle = `rgba(246, 234, 201, ${(0.55 * devour * (1 - finale) * tw).toFixed(3)})`
      g.lineWidth = Math.max(1.2, s.r * 0.8)
      g.beginPath()
      g.arc(x, y, pulled, ang - sweep / 2, ang + sweep / 2)
      g.stroke()
    }
    g.restore()
  }

  // ── 3. 漫畫集中線：從畫面外緣射向黑洞、長短隨時間閃爍 ──
  if (form > 0.5) {
    const lineA = Math.min(1, (form - 0.5) * 2) * (1 - finale)
    g.save()
    g.lineCap = 'round'
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.sin(i * 13.7) * 0.11
      const flick = 0.5 + 0.5 * Math.sin(time * 19 + i * 5.3)
      const outer = maxDist + 30
      const inner = r * 2.4 + (outer - r * 2.4) * (0.45 + 0.35 * flick)
      g.strokeStyle = `rgba(246, 234, 201, ${(lineA * (0.08 + 0.12 * flick)).toFixed(3)})`
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer)
      g.lineTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner)
      g.stroke()
    }
    g.restore()
  }

  // ── 4. 螺旋吸積流：三條發光虛線臂向內捲、dash 流動＝物質被抽進去 ──
  if (devour > 0.02 && finale < 0.6) {
    g.save()
    g.translate(x, y)
    g.globalCompositeOperation = 'lighter'
    g.lineCap = 'round'
    g.setLineDash([13, 11])
    g.lineDashOffset = -time * 170 // 虛線往洞裡流
    const armA = 0.4 * devour * (1 - finale)
    const rOuter = maxDist * (0.55 + 0.45 * devour)
    for (let i = 0; i < 3; i++) {
      const phase = time * 2.6 + (i * Math.PI * 2) / 3
      g.strokeStyle = `rgba(255, 201, 110, ${armA.toFixed(3)})`
      g.lineWidth = 3.5
      g.beginPath()
      const N = 26
      for (let k = 0; k <= N; k++) {
        const s = k / N // 0=外緣 → 1=洞口
        const rad = r * 1.25 + (rOuter - r * 1.25) * Math.pow(1 - s, 1.7)
        const ang = phase + s * 5.4
        const px = Math.cos(ang) * rad
        const py = Math.sin(ang) * rad
        if (k === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.stroke()
    }
    g.setLineDash([])
    g.restore()
  }

  g.save()
  g.translate(x, y)

  // ── 5. 洞口熾熱光暈：吸積物質摩擦發光，隨吞噬加劇脈動 ──
  const pulse = 0.8 + 0.2 * Math.sin(time * 11)
  const heat = g.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.8)
  heat.addColorStop(0, `rgba(255, 190, 100, ${(0.4 * intensity * pulse).toFixed(3)})`)
  heat.addColorStop(0.55, `rgba(255, 150, 70, ${(0.16 * intensity * pulse).toFixed(3)})`)
  heat.addColorStop(1, 'rgba(255, 150, 70, 0)')
  g.fillStyle = heat
  g.beginPath()
  g.arc(0, 0, r * 2.8, 0, Math.PI * 2)
  g.fill()

  // ── 5b. 相對論極噴流：兩道細長光錐沿傾斜自轉軸射出（形成期淡入、終幕淡出） ──
  if (form > 0.55) {
    const jetA = clamp01((form - 0.55) / 0.45) * (1 - finale) * (0.5 + 0.5 * devour)
    g.save()
    g.rotate(0.4)
    g.globalCompositeOperation = 'lighter'
    const jetLen = r * (2.6 + devour * 3.2)
    for (const dir of [-1, 1]) {
      const grad = g.createLinearGradient(0, 0, 0, dir * jetLen)
      grad.addColorStop(0, `rgba(190, 224, 255, ${(0.55 * jetA * pulse).toFixed(3)})`)
      grad.addColorStop(0.4, `rgba(150, 200, 255, ${(0.22 * jetA).toFixed(3)})`)
      grad.addColorStop(1, 'rgba(150, 200, 255, 0)')
      g.fillStyle = grad
      const w0 = r * 0.16
      const w1 = r * 0.5
      g.beginPath()
      g.moveTo(-w0, 0)
      g.lineTo(-w1, dir * jetLen)
      g.lineTo(w1, dir * jetLen)
      g.lineTo(w0, 0)
      g.closePath()
      g.fill()
      // 亮核心線
      g.strokeStyle = `rgba(230, 244, 255, ${(0.5 * jetA * pulse).toFixed(3)})`
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, dir * jetLen)
      g.stroke()
    }
    g.restore()
  }

  // ── 6. 吸積盤：三圈傾斜橢圓、交錯反轉、都卜勒亮側（一半亮一半暗） ──
  for (let i = 0; i < 3; i++) {
    g.save()
    const dir = i % 2 === 0 ? 1 : -1
    g.rotate(time * dir * (3.8 - i * 0.9) + i * 1.3)
    const ringR = r * (1.55 + i * 0.42)
    const grad = g.createLinearGradient(-ringR, 0, ringR, 0)
    grad.addColorStop(0, 'rgba(255, 201, 110, 0)')
    grad.addColorStop(0.5, `rgba(255, 214, 130, ${(0.6 - i * 0.14) * intensity})`)
    grad.addColorStop(1, 'rgba(255, 201, 110, 0)')
    g.strokeStyle = grad
    g.lineWidth = 6.5 - i * 1.6
    g.beginPath()
    g.ellipse(0, 0, ringR, ringR * (0.3 + i * 0.05), 0, 0, Math.PI * 2)
    g.stroke()
    // 都卜勒亮側：朝向我們旋來的那半段加一道熾白
    g.strokeStyle = `rgba(255, 244, 220, ${(0.5 - i * 0.12) * intensity})`
    g.lineWidth = 2.5 - i * 0.5
    g.beginPath()
    g.ellipse(0, 0, ringR, ringR * (0.3 + i * 0.05), 0, Math.PI * 0.15, Math.PI * 0.85)
    g.stroke()
    g.restore()
  }

  // ── 6b. 落入餘燼：碎屑螺旋墜入、越接近洞口越熾紅（顆粒質感） ──
  if (devour > 0.05 && finale < 0.55) {
    g.save()
    g.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 22; i++) {
      const tt = (time * 0.55 + i * 0.11) % 1 // 0=外緣 → 1=洞口
      const rad = r * 1.05 + (maxDist * 0.45 - r * 1.05) * Math.pow(1 - tt, 1.4)
      const ang = i * 2.39 + tt * 6.5 + time * 1.4
      const px = Math.cos(ang) * rad
      const py = Math.sin(ang) * rad
      const a = devour * (1 - finale) * Math.sin(tt * Math.PI) * 0.85
      const sz = 1.3 + 2.6 * tt
      const gg = Math.round(210 - tt * 90)
      const bb = Math.round(140 - tt * 100)
      g.fillStyle = `rgba(255, ${gg}, ${bb}, ${a.toFixed(3)})`
      g.beginPath()
      g.arc(px, py, sz, 0, Math.PI * 2)
      g.fill()
    }
    g.restore()
  }

  // ── 7. 光子環：貼著視界的一圈熾白細環（手繪抖動邊線） ──
  g.strokeStyle = `rgba(255, 246, 224, ${(0.85 * intensity).toFixed(3)})`
  g.lineWidth = 2
  wobblyCirclePath(g, r * 1.14, 7.3)
  g.stroke()

  // ── 7b. 愛因斯坦環：重力透鏡把吸積盤遠側彎折成環繞視界的亮環（上下最亮） ──
  g.save()
  g.globalCompositeOperation = 'lighter'
  const ering = g.createLinearGradient(0, -r * 1.35, 0, r * 1.35)
  ering.addColorStop(0, `rgba(255, 236, 200, ${(0.55 * intensity).toFixed(3)})`)
  ering.addColorStop(0.5, `rgba(255, 210, 150, ${(0.14 * intensity).toFixed(3)})`)
  ering.addColorStop(1, `rgba(255, 236, 200, ${(0.55 * intensity).toFixed(3)})`)
  g.strokeStyle = ering
  g.lineWidth = 2.5
  g.beginPath()
  g.ellipse(0, 0, r * 1.2, r * 1.28, 0, 0, Math.PI * 2)
  g.stroke()
  g.restore()

  // ── 8. 事件視界：手繪抖動純黑圓、暖色鑲邊 + 一絲藍紫色像差 ──
  g.fillStyle = '#0B0611'
  wobblyCirclePath(g, r, 9.1)
  g.fill()
  g.strokeStyle = `rgba(255, 190, 120, ${(0.9 * intensity).toFixed(3)})`
  g.lineWidth = 3
  g.stroke()
  g.strokeStyle = `rgba(150, 180, 255, ${(0.35 * intensity).toFixed(3)})`
  g.lineWidth = 1.5
  wobblyCirclePath(g, r * 1.07, 4.7)
  g.stroke()

  g.restore()
}

/**
 * 終幕白閃＋衝擊波環：黑洞塌縮回奇點的瞬間整個畫面炸亮，
 * 疊在粒子之上（game.draw 最後呼叫），亮完新恆星誕生。
 */
export function drawSupernovaFlash(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const { finale } = bhProgress(t)
  if (finale <= 0) return
  const flashA = finale < 0.22 ? finale / 0.22 : Math.max(0, (1 - finale) / 0.78)
  const grad = g.createRadialGradient(x, y, 0, x, y, BOARD.height)
  grad.addColorStop(0, `rgba(255, 248, 228, ${(0.95 * flashA).toFixed(3)})`)
  grad.addColorStop(0.55, `rgba(255, 226, 170, ${(0.75 * flashA).toFixed(3)})`)
  grad.addColorStop(1, `rgba(255, 200, 130, ${(0.5 * flashA).toFixed(3)})`)
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.height)
  // 兩圈手繪墨線衝擊波向外擴
  g.save()
  g.lineCap = 'round'
  for (const [speed, lw] of [
    [720, 5],
    [520, 3],
  ] as const) {
    g.strokeStyle = `rgba(246, 234, 201, ${(0.8 * (1 - finale)).toFixed(3)})`
    g.lineWidth = lw
    g.setLineDash([16, 12])
    g.beginPath()
    g.arc(x, y, 8 + finale * speed, 0, Math.PI * 2)
    g.stroke()
  }
  g.setLineDash([])
  g.restore()
}

/* ══════════════ 星球表面（紙剪拼貼風） ══════════════ */

function paintBands(
  g: CanvasRenderingContext2D,
  r: number,
  stripes: Array<{ y: number; h: number; color: string; alpha: number }>,
) {
  for (const s of stripes) {
    g.globalAlpha = s.alpha
    g.fillStyle = s.color
    g.beginPath()
    g.ellipse(0, s.y * r, r, (s.h / 2) * r, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

function paintCraters(
  g: CanvasRenderingContext2D,
  r: number,
  color: string,
  spots: Array<[number, number, number]>,
) {
  for (const [x, y, s] of spots) {
    g.globalAlpha = 0.4
    g.fillStyle = color
    g.beginPath()
    g.arc(x * r, y * r, s * r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

/** '#RRGGBB' → [r,g,b] */
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * 系外恆星（tier 11+）的烘焙表面：熱核高光 + 邊緣暗化（球體感），
 * 再依 starStyle 疊上各自的個性紋理——巨星的對流米粒、紅矮星的黑子、
 * 繞射星的明亮平滑核、放射星的熱斑。全部烘進 sprite 快取，每階級只算一次。
 */
function paintStarSurface(g: CanvasRenderingContext2D, tier: PlanetTier, r: number) {
  const [er, eg, eb] = hexRgb(tier.edge)
  const rnd = (k: number) => {
    const s = Math.sin(tier.tier * 12.9898 + k * 78.233) * 43758.5453
    return s - Math.floor(s)
  }

  // 熱核高光：中心偏左上更亮，帶出球體立體感
  const core = g.createRadialGradient(-r * 0.18, -r * 0.2, r * 0.05, 0, 0, r * 1.05)
  core.addColorStop(0, 'rgba(255,253,244,0.6)')
  core.addColorStop(0.45, 'rgba(255,250,235,0.14)')
  core.addColorStop(1, 'rgba(255,250,235,0)')
  g.fillStyle = core
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()

  // 邊緣暗化（limb darkening）
  const limb = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r)
  limb.addColorStop(0, `rgba(${er},${eg},${eb},0)`)
  limb.addColorStop(1, `rgba(${er},${eg},${eb},0.55)`)
  g.fillStyle = limb
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()

  switch (tier.starStyle) {
    case 'giant':
      // 巨星：大顆對流米粒（granulation）+ 幾點深色黑子
      for (let i = 0; i < 8; i++) {
        const a = rnd(i) * Math.PI * 2
        const rr = (0.12 + rnd(i + 7) * 0.55) * r
        const bs = (0.16 + rnd(i + 14) * 0.16) * r
        g.globalAlpha = 0.22
        g.fillStyle = i % 3 === 0 ? '#2A1512' : tier.edge
        g.beginPath()
        g.arc(Math.cos(a) * rr, Math.sin(a) * rr, bs, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
      break
    case 'diffraction':
      // 全天最亮：明亮平滑，中心一塊熾白熱核
      g.globalAlpha = 0.5
      g.fillStyle = '#FFFFFF'
      g.beginPath()
      g.arc(-r * 0.12, -r * 0.14, r * 0.32, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    case 'rays':
      // 熾烈：中心向外的白熱斑條紋
      g.globalAlpha = 0.16
      g.fillStyle = '#FFFFFF'
      for (let i = 0; i < 6; i++) {
        g.save()
        g.rotate(rnd(i) * Math.PI * 2)
        g.beginPath()
        g.ellipse(r * 0.35, 0, r * 0.42, r * 0.08, 0, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
      g.globalAlpha = 1
      break
    case 'flare':
      // 紅矮星：較多深色黑子（多變、情緒化）
      for (let i = 0; i < 6; i++) {
        const a = rnd(i) * Math.PI * 2
        const rr = (0.1 + rnd(i + 5) * 0.5) * r
        g.globalAlpha = 0.3
        g.fillStyle = tier.edge
        g.beginPath()
        g.arc(Math.cos(a) * rr, Math.sin(a) * rr, (0.1 + rnd(i + 11) * 0.1) * r, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
      break
    default:
      // soft / north：柔和幾點淺斑
      for (let i = 0; i < 4; i++) {
        const a = rnd(i) * Math.PI * 2
        const rr = (0.15 + rnd(i + 3) * 0.4) * r
        g.globalAlpha = 0.14
        g.fillStyle = '#FFFFFF'
        g.beginPath()
        g.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.12 * r, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
  }
}

function paintSurface(g: CanvasRenderingContext2D, tier: PlanetTier, r: number) {
  switch (tier.tier) {
    case 0:
      paintCraters(g, r, '#7E7261', [
        [-0.35, 0.2, 0.22],
        [0.3, -0.25, 0.16],
        [0.15, 0.45, 0.13],
      ])
      break
    case 1:
      paintCraters(g, r, '#B5A788', [
        [-0.3, -0.2, 0.2],
        [0.35, 0.15, 0.15],
        [-0.1, 0.45, 0.12],
        [0.1, -0.5, 0.1],
      ])
      break
    case 2:
      paintCraters(g, r, '#A87B33', [
        [-0.4, 0.1, 0.13],
        [0.25, -0.35, 0.11],
        [0.4, 0.35, 0.1],
      ])
      paintBands(g, r, [{ y: 0.55, h: 0.3, color: '#C19140', alpha: 0.3 }])
      break
    case 3:
      paintBands(g, r, [
        { y: 0.15, h: 0.5, color: '#A3452E', alpha: 0.3 },
        { y: -0.4, h: 0.3, color: '#B0503A', alpha: 0.25 },
      ])
      g.globalAlpha = 0.85
      g.fillStyle = '#F4E8DA'
      g.beginPath()
      g.ellipse(0, -r * 0.88, r * 0.45, r * 0.18, 0, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    case 4:
      paintBands(g, r, [
        { y: -0.45, h: 0.35, color: '#F7E0C3', alpha: 0.55 },
        { y: 0.05, h: 0.3, color: '#E8C79B', alpha: 0.45 },
        { y: 0.5, h: 0.35, color: '#F7E0C3', alpha: 0.5 },
      ])
      break
    case 5: {
      g.fillStyle = '#94BA88'
      g.globalAlpha = 0.95
      g.beginPath()
      g.ellipse(-r * 0.35, -r * 0.25, r * 0.34, r * 0.24, -0.5, 0, Math.PI * 2)
      g.ellipse(r * 0.3, r * 0.3, r * 0.28, r * 0.34, 0.4, 0, Math.PI * 2)
      g.ellipse(r * 0.45, -r * 0.45, r * 0.16, r * 0.12, 0, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 0.5
      g.fillStyle = '#F4EDE0'
      g.beginPath()
      g.ellipse(-r * 0.1, r * 0.5, r * 0.5, r * 0.1, 0.15, 0, Math.PI * 2)
      g.ellipse(r * 0.2, -r * 0.55, r * 0.4, r * 0.09, -0.1, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    }
    case 6:
      paintBands(g, r, [
        { y: -0.35, h: 0.3, color: '#4E5890', alpha: 0.45 },
        { y: 0.3, h: 0.4, color: '#6973B2', alpha: 0.35 },
      ])
      break
    case 7:
      paintBands(g, r, [
        { y: -0.5, h: 0.4, color: '#C2E6E9', alpha: 0.5 },
        { y: 0.1, h: 0.3, color: '#5B989E', alpha: 0.3 },
        { y: 0.6, h: 0.35, color: '#C2E6E9', alpha: 0.4 },
      ])
      break
    case 8:
      paintBands(g, r, [
        { y: -0.55, h: 0.3, color: '#F2DCAE', alpha: 0.5 },
        { y: -0.1, h: 0.35, color: '#C58F3D', alpha: 0.35 },
        { y: 0.4, h: 0.3, color: '#EFD198', alpha: 0.45 },
      ])
      break
    case 9:
      paintBands(g, r, [
        { y: -0.6, h: 0.28, color: '#F0CFA8', alpha: 0.55 },
        { y: -0.25, h: 0.25, color: '#B5683B', alpha: 0.45 },
        { y: 0.15, h: 0.3, color: '#EDB987', alpha: 0.5 },
        { y: 0.55, h: 0.28, color: '#A8602F', alpha: 0.4 },
      ])
      g.globalAlpha = 0.9
      g.fillStyle = '#C44F3C'
      g.beginPath()
      g.ellipse(r * 0.3, r * 0.32, r * 0.2, r * 0.13, 0.2, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    case 10:
      paintBands(g, r, [
        { y: -0.4, h: 0.4, color: '#F9E59A', alpha: 0.5 },
        { y: 0.35, h: 0.45, color: '#E0A93E', alpha: 0.35 },
      ])
      break
    default:
      // 系外恆星（11+）：各具個性的恆星表面（見 paintStarSurface）
      paintStarSurface(g, tier, r)
      break
  }
}

/* ══════════════ 星球本體（手繪紙剪風） ══════════════ */

/**
 * Sprite 快取：身體 + 紙剪陰影 + 表面紋理 + 描邊都是靜態的，
 * 每階級只渲染一次（2x 解析度），之後 drawImage 旋轉縮放，省掉每幀的 path/clip 成本。
 */
const SPRITE_RES = 2
const spriteCache = new Map<number, HTMLCanvasElement>()

function getPlanetSprite(tier: PlanetTier): HTMLCanvasElement | null {
  const cached = spriteCache.get(tier.tier)
  if (cached) return cached
  if (typeof document === 'undefined') return null

  const r = tier.radius
  const seed = tier.tier * 3.7 + 1
  const margin = 1.12 // 抖動邊線 + 描邊的餘裕
  const size = Math.ceil(r * margin * 2 * SPRITE_RES)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (!g) return null
  g.setTransform(SPRITE_RES, 0, 0, SPRITE_RES, size / 2, size / 2)

  // 平塗主體（抖動邊線）
  g.fillStyle = tier.color
  wobblyCirclePath(g, r, seed)
  g.fill()

  // 紙剪陰影：clip 進主體，疊一層往右下偏的陰影色
  g.save()
  wobblyCirclePath(g, r, seed)
  g.clip()
  g.fillStyle = tier.edge
  g.globalAlpha = 0.55
  g.beginPath()
  g.arc(-r * 0.16, -r * 0.18, r * 1.05, 0, Math.PI * 2)
  // evenodd：填「主體扣掉偏移圓」之外的月牙
  wobblyCirclePath(g, r * 1.4, seed)
  g.fill('evenodd')
  g.globalAlpha = 1
  paintSurface(g, tier, r)
  g.restore()

  // 紙感高光：左上一小塊平塗白
  g.globalAlpha = 0.5
  g.fillStyle = '#FFF9EC'
  g.beginPath()
  g.ellipse(-r * 0.42, -r * 0.45, r * 0.2, r * 0.1, -0.7, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1

  // 墨水描邊
  g.strokeStyle = INK
  g.lineWidth = Math.max(2, r * 0.055)
  wobblyCirclePath(g, r, seed)
  g.stroke()

  spriteCache.set(tier.tier, c)
  return c
}

/** 恆星光冕色 'r,g,b' → [r,g,b]（未設定＝太陽暖橘） */
function starRgb(tier: PlanetTier): [number, number, number] {
  if (!tier.corona) return [232, 179, 60]
  const p = tier.corona.split(',').map(s => parseInt(s.trim(), 10))
  return [p[0] ?? 232, p[1] ?? 179, p[2] ?? 60]
}

/** 一道從基部向 +x 延伸、由亮到透明的細長光芒（近基部微鼓、向尖端收窄） */
function coronaSpike(
  g: CanvasRenderingContext2D,
  r: number,
  len: number,
  halfW: number,
  col: (a: number) => string,
) {
  const inner = r * 0.42
  const mid = inner + (len - inner) * 0.3
  const grad = g.createLinearGradient(inner, 0, len, 0)
  grad.addColorStop(0, col(0.05))
  grad.addColorStop(0.25, col(0.5))
  grad.addColorStop(1, col(0))
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(inner, 0)
  g.lineTo(mid, -halfW)
  g.lineTo(len, 0)
  g.lineTo(mid, halfW)
  g.closePath()
  g.fill()
}

/**
 * 系外恆星（tier 11+）的動態光冕：柔和呼吸光暈 + 依 starStyle 各異的光芒。
 * additive（lighter）疊加，每顆恆星一眼可辨個性。太陽（無 starStyle）仍走原本三角光芒。
 */
function drawStarCorona(g: CanvasRenderingContext2D, tier: PlanetTier, r: number, time: number) {
  const [cr, cg, cb] = starRgb(tier)
  const col = (a: number) => `rgba(${cr},${cg},${cb},${a.toFixed(3)})`
  const style = tier.starStyle
  g.save()
  g.globalCompositeOperation = 'lighter'

  // 共同：柔和呼吸光暈（巨星脈動更慢更大）
  const pulse = 0.85 + 0.15 * Math.sin(time * (style === 'giant' ? 0.9 : 1.7) + tier.tier)
  const haloR = r * (style === 'giant' ? 2.0 : 1.75) * pulse
  const halo = g.createRadialGradient(0, 0, r * 0.7, 0, 0, haloR)
  halo.addColorStop(0, col(0.4))
  halo.addColorStop(0.45, col(0.14))
  halo.addColorStop(1, col(0))
  g.fillStyle = halo
  g.beginPath()
  g.arc(0, 0, haloR, 0, Math.PI * 2)
  g.fill()

  if (style === 'giant') {
    // 巨星：不規則翻騰光暈邊界（半規則變星脈動），無銳芒
    for (let layer = 0; layer < 2; layer++) {
      const seg = 48
      const rr = r * (1.12 + layer * 0.14)
      g.beginPath()
      for (let i = 0; i <= seg; i++) {
        const th = (i / seg) * Math.PI * 2
        const wob =
          1 + 0.11 * Math.sin(th * 3 + time * 1.1 + layer * 2) + 0.06 * Math.sin(th * 6 - time * 0.7)
        const pr = rr * wob
        const px = Math.cos(th) * pr
        const py = Math.sin(th) * pr
        i ? g.lineTo(px, py) : g.moveTo(px, py)
      }
      g.closePath()
      g.fillStyle = col(0.1 - layer * 0.035)
      g.fill()
    }
  } else if (style === 'north') {
    // 北極星：縱長橫短的標誌性大四芒 + 細對角芒
    const tw = 0.9 + 0.12 * Math.sin(time * 2.6 + tier.tier)
    for (const [ang, len] of [
      [-Math.PI / 2, 2.4],
      [Math.PI / 2, 2.4],
      [0, 1.5],
      [Math.PI, 1.5],
    ] as const) {
      g.save()
      g.rotate(ang)
      coronaSpike(g, r, r * (1 + len) * tw, r * 0.05, col)
      g.restore()
    }
    for (let i = 0; i < 4; i++) {
      g.save()
      g.rotate(Math.PI / 4 + (i * Math.PI) / 2)
      coronaSpike(g, r, r * 1.7 * tw, r * 0.03, col)
      g.restore()
    }
  } else if (style === 'diffraction') {
    // 全天最亮：銳利相機繞射星芒（4 長 + 4 中）
    const tw = 0.9 + 0.12 * Math.sin(time * 2.6 + tier.tier)
    for (let i = 0; i < 4; i++) {
      g.save()
      g.rotate((i * Math.PI) / 2)
      coronaSpike(g, r, r * 2.5 * tw, r * 0.04, col)
      g.restore()
    }
    for (let i = 0; i < 4; i++) {
      g.save()
      g.rotate(Math.PI / 4 + (i * Math.PI) / 2)
      coronaSpike(g, r, r * 1.5 * tw, r * 0.03, col)
      g.restore()
    }
  } else if (style === 'flare') {
    // 紅矮星：短放射芒 + 週期性閃焰弧（每 ~5 秒一次，limb 亮弧升起又落下）
    g.save()
    g.rotate(Math.sin(time * 0.25) * 0.1)
    for (let i = 0; i < 10; i++) {
      const fl = 0.85 + 0.35 * Math.sin(time * 4 + i * 1.9)
      g.save()
      g.rotate((i / 10) * Math.PI * 2)
      coronaSpike(g, r, r * (1.25 + 0.2 * fl), r * 0.05, col)
      g.restore()
    }
    g.restore()
    const fp = (time % 5) / 5
    if (fp < 0.5) {
      const env = Math.sin((fp / 0.5) * Math.PI)
      const fang = (Math.floor(time / 5) * 2.4) % (Math.PI * 2)
      g.save()
      g.rotate(fang)
      g.strokeStyle = col(0.6 * env)
      g.lineWidth = r * 0.06
      g.beginPath()
      g.arc(r * 1.15, 0, r * 0.35 * env, Math.PI * 0.5, Math.PI * 1.5)
      g.stroke()
      g.restore()
    }
  } else {
    // rays（Rigel/Deneb 長而熾）/ soft（Vega 少而柔）
    const n = style === 'soft' ? 12 : 18
    const baseLen = style === 'soft' ? 1.4 : 1.85
    const hw = style === 'soft' ? 0.05 : 0.04
    g.save()
    g.rotate(Math.sin(time * 0.2) * 0.07)
    for (let i = 0; i < n; i++) {
      const fl = 1 + 0.28 * Math.sin(time * 3 + i * 1.7)
      g.save()
      g.rotate((i / n) * Math.PI * 2)
      coronaSpike(g, r, r * baseLen * fl, r * hw, col)
      g.restore()
    }
    g.restore()
  }
  g.restore()
}

/**
 * 畫一顆 cozy 星球：sprite 本體 + 動態的環/光芒/墨水表情。
 * 表面跟著物理角度旋轉、表情永遠朝上。
 */
export function drawPlanet(
  g: CanvasRenderingContext2D,
  tier: PlanetTier,
  x: number,
  y: number,
  angle: number,
  scale = 1,
  time = 0,
  /** 每顆星球唯一種子，讓同階星球的臉略有不同（眨眼/眼距/嘴弧/腮紅） */
  faceSeed = tier.tier + 1,
  /** 誕生後經過秒數；< 0.6 秒時綻放「剛合併」的開心臉，預設 999 = 平常臉 */
  age = 999,
  /** 危機程度 0~1：越接近頂線越緊張（冒汗、笑容轉擔心），預設 0 */
  danger = 0,
  /** 焦躁等待 0~1：玩家久未投放時的不耐煩臉（半垂眼、往上瞟、直線嘴），預設 0 */
  bored = 0,
  /** 打哈欠 0~1：閒置很久時隨機星球打哈欠（閉眼 + 大張嘴），預設 0 */
  yawn = 0,
) {
  const r = tier.radius * scale
  const seed = tier.tier * 3.7 + 1
  g.save()
  g.translate(x, y)

  // 恆星光冕：太陽走手繪三角光芒；系外恆星（有 starStyle）各具個性的光冕
  if (tier.glow) {
    if (tier.starStyle) {
      drawStarCorona(g, tier, r, time)
    } else {
      // 太陽：先鋪一層暖色呼吸光暈（與系外恆星視覺一致、更有質感），再畫手繪三角光芒
      g.save()
      g.globalCompositeOperation = 'lighter'
      const sunPulse = 0.9 + 0.1 * Math.sin(time * 1.6)
      const sunHalo = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.7 * sunPulse)
      sunHalo.addColorStop(0, 'rgba(255, 210, 110, 0.4)')
      sunHalo.addColorStop(0.5, 'rgba(255, 190, 90, 0.14)')
      sunHalo.addColorStop(1, 'rgba(255, 190, 90, 0)')
      g.fillStyle = sunHalo
      g.beginPath()
      g.arc(0, 0, r * 1.7 * sunPulse, 0, Math.PI * 2)
      g.fill()
      g.restore()
      // 手繪三角光芒，緩慢呼吸（原地搖曳，不整圈旋轉）
      g.save()
      g.rotate(Math.sin(time * 0.2) * 0.12)
      g.fillStyle = 'rgba(232, 179, 60, 0.75)'
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6)
        const flare = 1 + 0.18 * Math.sin(time * 2.5 + i * 1.7)
        g.beginPath()
        g.moveTo(r * 1.04, -r * 0.09)
        g.lineTo(r * (1.26 + 0.1 * flare), 0)
        g.lineTo(r * 1.04, r * 0.09)
        g.closePath()
        g.fill()
      }
      g.restore()
    }
  }

  // 行星環（後半）：雙線手繪感
  if (tier.ring) {
    g.save()
    g.rotate(-0.35)
    g.strokeStyle = '#EFD7A7'
    g.lineWidth = r * 0.15
    g.globalAlpha = 0.95
    g.beginPath()
    g.ellipse(0, 0, r * 1.28, r * 0.4, 0, Math.PI * 0.05, Math.PI * 0.95)
    g.stroke()
    g.strokeStyle = INK
    g.lineWidth = Math.max(1.2, r * 0.02)
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(0, 0, r * 1.34, r * 0.44, 0, Math.PI * 0.08, Math.PI * 0.92)
    g.stroke()
    g.restore()
  }

  g.rotate(angle)

  const sprite = getPlanetSprite(tier)
  if (sprite) {
    const half = (sprite.width / SPRITE_RES / 2) * scale
    g.drawImage(sprite, -half, -half, half * 2, half * 2)
  } else {
    // 無 DOM 環境的退路：直接平塗
    g.fillStyle = tier.color
    wobblyCirclePath(g, r, seed)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = Math.max(2, r * 0.055)
    g.stroke()
  }

  g.rotate(-angle) // 臉永遠朝上

  // 行星環（前半）
  if (tier.ring) {
    g.save()
    g.rotate(-0.35)
    g.strokeStyle = '#E5C684'
    g.lineWidth = r * 0.15
    g.beginPath()
    g.ellipse(0, 0, r * 1.28, r * 0.4, 0, Math.PI * 1.05, Math.PI * 1.95)
    g.stroke()
    g.strokeStyle = INK
    g.lineWidth = Math.max(1.2, r * 0.02)
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(0, 0, r * 1.34, r * 0.44, 0, Math.PI * 1.08, Math.PI * 1.92)
    g.stroke()
    g.restore()
  }

  // 墨水表情：用 faceSeed 做穩定的個體微調，誕生瞬間綻放開心臉
  const rnd = (k: number) => {
    const s = Math.sin(faceSeed * 1.13 + k * 7.31) * 43758.5453
    return s - Math.floor(s)
  }
  // 合併/誕生喜悅：誕生 0.6 秒內由 1 平滑（smoothstep）衰減到 0
  const jt = Math.min(1, Math.max(0, 1 - age / 0.6))
  const joy = jt * jt * (3 - 2 * jt)

  const vEyeSize = 1 + (rnd(1) - 0.5) * 0.3 // ±15% 眼睛大小
  const vEyeDX = 1 + (rnd(2) - 0.5) * 0.2 // ±10% 眼距
  const vMouth = 1 + (rnd(3) - 0.5) * 0.4 // ±20% 嘴弧
  const vBlushX = 1 + (rnd(4) - 0.5) * 0.3 // ±15% 腮紅位置
  const blinkPhase = rnd(5) * Math.PI * 2 // 眨眼相位錯開，不再整排同步

  const eyeY = -r * 0.12
  const eyeDX = r * 0.32 * vEyeDX
  const blink = Math.sin(time * 0.7 + blinkPhase) > 0.97 ? 0.15 : 1
  // 情緒解算（高優先壓低優先）：喜悅 > 危機緊張 > 焦躁不耐煩
  const worry = danger * (1 - joy)
  const tired = bored * (1 - joy) * (1 - worry) // 不耐煩，最低優先
  const stress = worry
  // 打哈欠：閉眼大張嘴的短暫動畫；危機時不打哈欠
  const yawnA = Math.max(0, yawn) * (1 - worry)

  // ── 眼睛 ──
  const eyeScale = vEyeSize * (1 + 0.25 * joy)
  const lookUp = tired * r * 0.05 // 不耐煩時往上瞟
  const droop = (1 - 0.45 * tired) * (1 - 0.85 * yawnA) // 不耐煩時半垂；打哈欠時閉起來
  g.fillStyle = INK
  g.strokeStyle = INK
  for (const dir of [-1, 1]) {
    const ex = dir * eyeDX
    // 一般 / 半垂的橢圓眼
    g.beginPath()
    g.ellipse(ex, eyeY - lookUp, r * 0.09 * eyeScale, r * 0.13 * eyeScale * blink * droop, 0, 0, Math.PI * 2)
    g.fill()
  }
  // 眼神高光：平常/開心才有（很睏半垂、打哈欠閉眼時不畫）
  if (blink === 1 && tired < 0.5 && yawnA < 0.3) {
    g.fillStyle = '#FFF9EC'
    for (const dir of [-1, 1]) {
      g.beginPath()
      g.arc(dir * eyeDX - r * 0.03, eyeY - r * 0.05 - lookUp, r * 0.032 * eyeScale, 0, Math.PI * 2)
      g.fill()
    }
  }
  // 不耐煩的半垂上眼瞼：壓在眼睛上緣的一道線
  if (tired > 0.2) {
    g.strokeStyle = INK
    g.globalAlpha = Math.min(1, (tired - 0.2) / 0.5)
    g.lineWidth = Math.max(1.3, r * 0.05)
    g.lineCap = 'round'
    for (const dir of [-1, 1]) {
      g.beginPath()
      g.moveTo(dir * eyeDX - r * 0.11, eyeY - r * 0.05 - lookUp)
      g.lineTo(dir * eyeDX + r * 0.11, eyeY - r * 0.06 - lookUp)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  // ── 嘴 ── 只畫一種：笑容在負面情緒升到 0.12 前就完全淡出，負面嘴才接手
  // （單一 if/else 鏈，避免笑弧與擔心嘴同時出現「邊擔心邊笑」）
  const neg = Math.max(worry, tired)
  const smileAlpha = joy > 0.01 ? 1 : Math.max(0, 1 - neg / 0.12)
  g.strokeStyle = INK
  g.lineWidth = Math.max(1.5, r * 0.045)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (yawnA > 0.06) {
    // 打哈欠：大大的圓張嘴（高度隨包絡漲縮）
    g.beginPath()
    g.ellipse(0, r * 0.18, r * 0.1 * (0.7 + 0.3 * yawnA), r * 0.17 * yawnA, 0, 0, Math.PI * 2)
    g.fillStyle = '#5A3C3C'
    g.fill()
    g.stroke()
  } else if (smileAlpha > 0.01) {
    const mouthR = r * (0.22 + 0.14 * joy) * vMouth
    const mouthSpread = 0.15 - 0.05 * joy
    g.globalAlpha = smileAlpha
    g.beginPath()
    g.arc(0, r * 0.12, mouthR, Math.PI * mouthSpread, Math.PI * (1 - mouthSpread))
    if (joy > 0.35) {
      g.fillStyle = `rgba(60,42,42,${(0.5 * joy).toFixed(3)})`
      g.fill()
    }
    g.stroke()
    g.globalAlpha = 1
  } else if (worry >= tired) {
    // 擔心的小張嘴
    g.globalAlpha = Math.min(1, worry * 1.6)
    g.beginPath()
    g.ellipse(0, r * 0.2, r * 0.09, r * 0.11, 0, 0, Math.PI * 2)
    g.stroke()
    g.globalAlpha = 1
  } else {
    // 不耐煩：一條略微下撇的直線嘴（—_—）
    g.globalAlpha = Math.min(1, tired * 1.6)
    g.beginPath()
    g.moveTo(-r * 0.15, r * 0.19)
    g.quadraticCurveTo(0, r * 0.22, r * 0.15, r * 0.19)
    g.stroke()
    g.globalAlpha = 1
  }
  // 腮紅（開心時更紅）
  g.globalAlpha = 0.5 + 0.3 * joy
  g.fillStyle = '#E2867A'
  for (const dir of [-1, 1]) {
    g.beginPath()
    g.ellipse(dir * r * 0.52 * vBlushX, r * 0.12, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1

  // 壓力汗滴：危機時於額角滑落
  if (stress > 0.2) {
    const drift = ((time * 0.9) % 1) * r * 0.18
    const dx = eyeDX * 1.25
    const dy = -r * 0.34 + drift
    g.globalAlpha = stress
    g.fillStyle = '#8FC7E8'
    g.beginPath()
    g.moveTo(dx, dy - r * 0.13)
    g.quadraticCurveTo(dx + r * 0.085, dy, dx, dy + r * 0.07)
    g.quadraticCurveTo(dx - r * 0.085, dy, dx, dy - r * 0.13)
    g.fill()
    g.globalAlpha = 1
  }

  // 誕生火花：合併瞬間四周冒出小四角星，隨 joy 淡出
  if (joy > 0.01) {
    g.fillStyle = '#FFF1B8'
    g.globalAlpha = joy
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * 1.5
      const sr = r * (1.05 + 0.3 * (1 - joy)) // 由內向外擴散
      const sx = Math.cos(a) * sr
      const sy = Math.sin(a) * sr - r * 0.1
      const ss = r * 0.07 * joy
      g.beginPath()
      g.moveTo(sx, sy - ss * 2)
      g.lineTo(sx + ss * 0.5, sy - ss * 0.5)
      g.lineTo(sx + ss * 2, sy)
      g.lineTo(sx + ss * 0.5, sy + ss * 0.5)
      g.lineTo(sx, sy + ss * 2)
      g.lineTo(sx - ss * 0.5, sy + ss * 0.5)
      g.lineTo(sx - ss * 2, sy)
      g.lineTo(sx - ss * 0.5, sy - ss * 0.5)
      g.closePath()
      g.fill()
    }
    g.globalAlpha = 1
  }

  g.restore()
}

/** 投放瞄準虛線 + 落點殘影圓環 */
export function drawAimLine(g: CanvasRenderingContext2D, x: number, r = 0, time = 0) {
  // 落地中心：自由落體到地板（無遮擋時）
  const landY = BOARD.height - r - 2
  const pulse = 0.5 + 0.5 * Math.sin(time * 4)
  g.save()
  // 較亮的手繪虛線
  g.strokeStyle = `rgba(246, 234, 201, ${0.5 + 0.18 * pulse})`
  g.setLineDash([6, 9])
  g.lineWidth = 2.5
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, BOARD.dropY)
  g.lineTo(x, landY)
  g.stroke()
  g.setLineDash([])

  // 落點殘影：當前星球大小的虛線圓環（脈動）
  if (r > 0) {
    g.strokeStyle = `rgba(232, 163, 61, ${0.45 + 0.3 * pulse})`
    g.setLineDash([4, 6])
    g.lineWidth = 2
    g.beginPath()
    g.arc(x, landY, r, 0, Math.PI * 2)
    g.stroke()
    // 中心小十字標記
    g.setLineDash([])
    g.strokeStyle = `rgba(246, 234, 201, ${0.4 + 0.25 * pulse})`
    g.lineWidth = 2
    const t = Math.min(r * 0.4, 7)
    g.beginPath()
    g.moveTo(x - t, landY)
    g.lineTo(x + t, landY)
    g.moveTo(x, landY - t)
    g.lineTo(x, landY + t)
    g.stroke()
  }
  g.restore()
}
