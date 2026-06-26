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

interface Star {
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
  /** 擠壓程度 0~1：被堆疊壓住或閒置過久時瞇眼咬牙的痛苦臉，預設 0 */
  squeeze = 0,
) {
  const r = tier.radius * scale
  const seed = tier.tier * 3.7 + 1
  g.save()
  g.translate(x, y)

  // 太陽：手繪三角光芒，緩慢呼吸
  if (tier.glow) {
    g.save()
    g.rotate(time * 0.15)
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
  // 情緒解算：喜悅（短暫）壓過負面；擠壓痛苦優先於危機緊張
  const pain = squeeze * (1 - joy)
  const worry = danger * (1 - joy) * (1 - pain)
  const stress = Math.max(pain, worry)

  // 眼睛：開心瞪大、痛苦瞇起
  const eyeScale = vEyeSize * (1 + 0.25 * joy)
  const squint = 1 - 0.6 * pain
  g.fillStyle = INK
  for (const dir of [-1, 1]) {
    g.beginPath()
    g.ellipse(dir * eyeDX, eyeY, r * 0.09 * eyeScale, r * 0.13 * eyeScale * blink * squint, 0, 0, Math.PI * 2)
    g.fill()
  }
  if (blink === 1 && pain < 0.5) {
    g.fillStyle = '#FFF9EC'
    for (const dir of [-1, 1]) {
      g.beginPath()
      g.arc(dir * eyeDX - r * 0.03, eyeY - r * 0.05, r * 0.032 * eyeScale, 0, Math.PI * 2)
      g.fill()
    }
  }
  // 痛苦時眉頭：兩道下壓的斜線
  if (pain > 0.25) {
    g.strokeStyle = INK
    g.globalAlpha = (pain - 0.25) / 0.75
    g.lineWidth = Math.max(1.3, r * 0.04)
    g.lineCap = 'round'
    for (const dir of [-1, 1]) {
      g.beginPath()
      g.moveTo(dir * eyeDX - dir * r * 0.1, eyeY - r * 0.28)
      g.lineTo(dir * eyeDX + dir * r * 0.06, eyeY - r * 0.18)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  // 嘴：依情緒挑一種——平常/大笑的弧、痛苦咬牙的鋸齒、危機的小張嘴
  g.strokeStyle = INK
  g.lineWidth = Math.max(1.5, r * 0.045)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const smileAlpha = Math.max(0, 1 - pain - worry)
  if (joy > 0.01 || smileAlpha > 0.01) {
    const mouthR = r * (0.22 + 0.14 * joy) * vMouth
    const mouthSpread = 0.15 - 0.05 * joy
    g.globalAlpha = joy > 0.01 ? 1 : smileAlpha
    g.beginPath()
    g.arc(0, r * 0.12, mouthR, Math.PI * mouthSpread, Math.PI * (1 - mouthSpread))
    if (joy > 0.35) {
      g.fillStyle = `rgba(60,42,42,${(0.5 * joy).toFixed(3)})`
      g.fill()
    }
    g.stroke()
    g.globalAlpha = 1
  }
  if (pain > 0.01) {
    // 咬牙：上排鋸齒
    g.globalAlpha = pain
    g.beginPath()
    const mw = r * 0.26
    const my = r * 0.2
    const teeth = 4
    g.moveTo(-mw, my)
    for (let i = 1; i <= teeth; i++) {
      const tx = -mw + (2 * mw * i) / teeth
      g.lineTo(tx, my + (i % 2 === 0 ? 0 : -r * 0.07))
    }
    g.stroke()
    g.globalAlpha = 1
  } else if (worry > 0.01) {
    // 擔心的小張嘴
    g.globalAlpha = worry
    g.beginPath()
    g.ellipse(0, r * 0.2, r * 0.09, r * 0.11, 0, 0, Math.PI * 2)
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

  // 壓力汗滴：危機或擠壓時於額角滑落
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
