import type { PlanetTier } from './planets'
import { BOARD } from './planets'

/* ══════════════ 背景：星空 + 星雲 + 流星 ══════════════ */

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
    r: 0.5 + rng() * 1.5,
    phase: rng() * Math.PI * 2,
    speed: 0.5 + rng() * 1.5,
  }))
}

/** 緩慢漂移的星雲色塊 */
function drawNebula(g: CanvasRenderingContext2D, time: number) {
  const blobs = [
    { x: 0.25, y: 0.3, r: 280, color: '124, 58, 237', drift: 0.7 }, // 紫
    { x: 0.8, y: 0.65, r: 260, color: '20, 184, 166', drift: 1.3 }, // 青
    { x: 0.55, y: 0.9, r: 220, color: '236, 72, 153', drift: 1.0 }, // 粉
  ]
  for (const b of blobs) {
    const bx = b.x * BOARD.width + Math.sin(time * 0.05 * b.drift) * 30
    const by = b.y * BOARD.height + Math.cos(time * 0.04 * b.drift) * 24
    const grad = g.createRadialGradient(bx, by, 0, bx, by, b.r)
    grad.addColorStop(0, `rgba(${b.color}, 0.10)`)
    grad.addColorStop(1, `rgba(${b.color}, 0)`)
    g.fillStyle = grad
    g.fillRect(bx - b.r, by - b.r, b.r * 2, b.r * 2)
  }
}

export function drawBackground(g: CanvasRenderingContext2D, stars: Star[], time: number) {
  const grad = g.createLinearGradient(0, 0, 0, BOARD.height)
  grad.addColorStop(0, '#0B0B1E')
  grad.addColorStop(0.6, '#141432')
  grad.addColorStop(1, '#1B1040')
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.height)

  drawNebula(g, time)

  for (const s of stars) {
    const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase))
    g.globalAlpha = tw
    g.fillStyle = '#E0E7FF'
    g.beginPath()
    g.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/** 偶爾劃過的流星 */
export class ShootingStars {
  private meteors: Meteor[] = []
  private nextSpawn = 2

  update(dt: number, time: number) {
    if (time > this.nextSpawn) {
      this.nextSpawn = time + 4 + Math.random() * 6
      const fromLeft = Math.random() > 0.5
      this.meteors.push({
        x: fromLeft ? -20 : BOARD.width + 20,
        y: 20 + Math.random() * BOARD.height * 0.35,
        vx: (fromLeft ? 1 : -1) * (350 + Math.random() * 200),
        vy: 130 + Math.random() * 90,
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
      const tail = 0.13 // 尾巴長度（秒）
      const grad = g.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      g.strokeStyle = grad
      g.lineWidth = 2
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(m.x, m.y)
      g.lineTo(m.x - m.vx * tail, m.y - m.vy * tail)
      g.stroke()
    }
  }
}

/* ══════════════ 警戒線 ══════════════ */

export function drawLoseLine(g: CanvasRenderingContext2D, time: number, danger: boolean) {
  const alpha = danger ? 0.5 + 0.5 * Math.sin(time * 8) : 0.18
  g.save()
  g.globalAlpha = alpha
  g.strokeStyle = danger ? '#F87171' : '#94A3B8'
  g.setLineDash([10, 8])
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(0, BOARD.loseY)
  g.lineTo(BOARD.width, BOARD.loseY)
  g.stroke()
  g.restore()
}

/** 瀕死紅暈（從頂端壓下來的危機感） */
export function drawDangerVignette(g: CanvasRenderingContext2D, time: number, intensity: number) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 6)
  const grad = g.createLinearGradient(0, 0, 0, BOARD.loseY * 1.6)
  grad.addColorStop(0, `rgba(239, 68, 68, ${0.34 * intensity * pulse})`)
  grad.addColorStop(1, 'rgba(239, 68, 68, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.loseY * 1.6)
}

/* ══════════════ 星球表面紋理 ══════════════ */

/** 在已 clip 的星球內畫橫向條紋（fraction 座標，-1～1） */
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

/** 隕石坑（fraction 座標） */
function paintCraters(
  g: CanvasRenderingContext2D,
  r: number,
  color: string,
  spots: Array<[number, number, number]>,
) {
  for (const [x, y, s] of spots) {
    g.globalAlpha = 0.35
    g.fillStyle = color
    g.beginPath()
    g.arc(x * r, y * r, s * r, 0, Math.PI * 2)
    g.fill()
    // 坑緣高光
    g.globalAlpha = 0.25
    g.strokeStyle = '#FFFFFF'
    g.lineWidth = Math.max(1, s * r * 0.2)
    g.beginPath()
    g.arc(x * r, y * r, s * r, Math.PI * 0.9, Math.PI * 1.7)
    g.stroke()
  }
  g.globalAlpha = 1
}

/** 各星球專屬表面（在 clip + 物理旋轉座標系內呼叫） */
function paintSurface(g: CanvasRenderingContext2D, tier: PlanetTier, r: number) {
  switch (tier.tier) {
    case 0: // 隕石：粗糙坑洞
      paintCraters(g, r, '#292524', [
        [-0.35, 0.2, 0.22],
        [0.3, -0.25, 0.16],
        [0.15, 0.45, 0.13],
      ])
      break
    case 1: // 月球：經典隕石坑
      paintCraters(g, r, '#78716C', [
        [-0.3, -0.2, 0.2],
        [0.35, 0.15, 0.15],
        [-0.1, 0.45, 0.12],
        [0.1, -0.5, 0.1],
      ])
      break
    case 2: // 水星：細小坑洞 + 焦灼條
      paintCraters(g, r, '#92400E', [
        [-0.4, 0.1, 0.13],
        [0.25, -0.35, 0.11],
        [0.4, 0.35, 0.1],
        [-0.05, -0.15, 0.08],
      ])
      paintBands(g, r, [{ y: 0.55, h: 0.3, color: '#B45309', alpha: 0.25 }])
      break
    case 3: // 火星：暗色地形 + 極冠
      paintBands(g, r, [
        { y: 0.15, h: 0.5, color: '#7F1D1D', alpha: 0.3 },
        { y: -0.4, h: 0.3, color: '#991B1B', alpha: 0.25 },
      ])
      g.globalAlpha = 0.8
      g.fillStyle = '#FEF2F2'
      g.beginPath()
      g.ellipse(0, -r * 0.88, r * 0.45, r * 0.18, 0, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    case 4: // 金星：乳白漩渦雲帶
      paintBands(g, r, [
        { y: -0.45, h: 0.35, color: '#FEF3C7', alpha: 0.5 },
        { y: 0.05, h: 0.3, color: '#FDE68A', alpha: 0.4 },
        { y: 0.5, h: 0.35, color: '#FEF3C7', alpha: 0.45 },
      ])
      break
    case 5: { // 地球：大陸 + 雲
      g.fillStyle = '#34D399'
      g.globalAlpha = 0.9
      g.beginPath()
      g.ellipse(-r * 0.35, -r * 0.25, r * 0.34, r * 0.24, -0.5, 0, Math.PI * 2)
      g.ellipse(r * 0.3, r * 0.3, r * 0.28, r * 0.34, 0.4, 0, Math.PI * 2)
      g.ellipse(r * 0.45, -r * 0.45, r * 0.16, r * 0.12, 0, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 0.4
      g.fillStyle = '#FFFFFF'
      g.beginPath()
      g.ellipse(-r * 0.1, r * 0.5, r * 0.5, r * 0.1, 0.15, 0, Math.PI * 2)
      g.ellipse(r * 0.2, -r * 0.55, r * 0.4, r * 0.09, -0.1, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    }
    case 6: // 海王星：深藍帶 + 大暗斑
      paintBands(g, r, [
        { y: -0.35, h: 0.3, color: '#312E81', alpha: 0.45 },
        { y: 0.3, h: 0.4, color: '#4338CA', alpha: 0.35 },
      ])
      g.globalAlpha = 0.5
      g.fillStyle = '#1E1B4B'
      g.beginPath()
      g.ellipse(-r * 0.25, -r * 0.05, r * 0.26, r * 0.16, -0.3, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 1
      break
    case 7: // 天王星：冰藍柔和帶
      paintBands(g, r, [
        { y: -0.5, h: 0.4, color: '#A5F3FC', alpha: 0.4 },
        { y: 0.1, h: 0.3, color: '#0E7490', alpha: 0.25 },
        { y: 0.6, h: 0.35, color: '#CFFAFE', alpha: 0.35 },
      ])
      break
    case 8: // 土星：金色雲帶（環在外面畫）
      paintBands(g, r, [
        { y: -0.55, h: 0.3, color: '#FEF3C7', alpha: 0.45 },
        { y: -0.1, h: 0.35, color: '#D97706', alpha: 0.3 },
        { y: 0.4, h: 0.3, color: '#FDE68A', alpha: 0.4 },
      ])
      break
    case 9: // 木星：醒目條紋 + 大紅斑
      paintBands(g, r, [
        { y: -0.6, h: 0.28, color: '#FED7AA', alpha: 0.55 },
        { y: -0.25, h: 0.25, color: '#C2410C', alpha: 0.45 },
        { y: 0.15, h: 0.3, color: '#FDBA74', alpha: 0.5 },
        { y: 0.55, h: 0.28, color: '#9A3412', alpha: 0.4 },
      ])
      g.globalAlpha = 0.85
      g.fillStyle = '#DC2626'
      g.beginPath()
      g.ellipse(r * 0.3, r * 0.32, r * 0.2, r * 0.13, 0.2, 0, Math.PI * 2)
      g.fill()
      g.globalAlpha = 0.4
      g.strokeStyle = '#FECACA'
      g.lineWidth = r * 0.03
      g.stroke()
      g.globalAlpha = 1
      break
    case 10: // 太陽：表面熱對流斑
      paintBands(g, r, [
        { y: -0.4, h: 0.4, color: '#FEF9C3', alpha: 0.4 },
        { y: 0.35, h: 0.45, color: '#F97316', alpha: 0.3 },
      ])
      break
  }
}

/* ══════════════ 星球本體 ══════════════ */

/**
 * 畫一顆 chibi 星球：漸層球體 + 專屬表面紋理 + 可愛表情。
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
) {
  const r = tier.radius * scale
  g.save()
  g.translate(x, y)

  // 太陽：動態日冕光環 + 旋轉光芒
  if (tier.glow) {
    const breathe = 1 + 0.06 * Math.sin(time * 2)
    const glow = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.9 * breathe)
    glow.addColorStop(0, 'rgba(253, 224, 71, 0.5)')
    glow.addColorStop(1, 'rgba(253, 224, 71, 0)')
    g.fillStyle = glow
    g.beginPath()
    g.arc(0, 0, r * 1.9 * breathe, 0, Math.PI * 2)
    g.fill()

    g.save()
    g.rotate(time * 0.3)
    g.fillStyle = 'rgba(253, 224, 71, 0.35)'
    for (let i = 0; i < 12; i++) {
      g.rotate(Math.PI / 6)
      const flare = 1 + 0.25 * Math.sin(time * 3 + i)
      g.beginPath()
      g.moveTo(r * 1.02, -r * 0.07)
      g.lineTo(r * (1.22 + 0.12 * flare), 0)
      g.lineTo(r * 1.02, r * 0.07)
      g.closePath()
      g.fill()
    }
    g.restore()
  }

  // 行星環（後半）
  if (tier.ring) {
    g.save()
    g.rotate(-0.35)
    g.strokeStyle = '#FDE68A'
    g.lineWidth = r * 0.16
    g.globalAlpha = 0.9
    g.beginPath()
    g.ellipse(0, 0, r * 1.45, r * 0.42, 0, Math.PI * 0.05, Math.PI * 0.95)
    g.stroke()
    g.restore()
  }

  g.rotate(angle)

  // 球體
  const body = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r)
  body.addColorStop(0, '#FFFFFF')
  body.addColorStop(0.25, tier.color)
  body.addColorStop(1, tier.edge)
  g.fillStyle = body
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()

  // 表面紋理（clip 在球內）
  g.save()
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.clip()
  paintSurface(g, tier, r)
  // 邊緣陰影增加立體感
  const rim = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(10, 5, 30, 0.35)')
  g.fillStyle = rim
  g.fillRect(-r, -r, r * 2, r * 2)
  g.restore()

  // 粗邊框（chibi 風格）
  g.strokeStyle = 'rgba(15, 10, 40, 0.55)'
  g.lineWidth = Math.max(2, r * 0.07)
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.stroke()

  g.rotate(-angle) // 臉永遠朝上

  // 行星環（前半）
  if (tier.ring) {
    g.save()
    g.rotate(-0.35)
    g.strokeStyle = '#FCD34D'
    g.lineWidth = r * 0.16
    g.beginPath()
    g.ellipse(0, 0, r * 1.45, r * 0.42, 0, Math.PI * 1.05, Math.PI * 1.95)
    g.stroke()
    g.restore()
  }

  // chibi 表情：眼睛 + 嘴巴 + 腮紅
  const eyeY = -r * 0.12
  const eyeDX = r * 0.32
  const blink = Math.sin(time * 0.7 + tier.tier * 1.3) > 0.97 ? 0.15 : 1
  g.fillStyle = '#1C1917'
  for (const dir of [-1, 1]) {
    g.beginPath()
    g.ellipse(dir * eyeDX, eyeY, r * 0.1, r * 0.14 * blink, 0, 0, Math.PI * 2)
    g.fill()
  }
  if (blink === 1) {
    g.fillStyle = '#FFFFFF'
    for (const dir of [-1, 1]) {
      g.beginPath()
      g.arc(dir * eyeDX - r * 0.03, eyeY - r * 0.05, r * 0.035, 0, Math.PI * 2)
      g.fill()
    }
  }
  // 微笑
  g.strokeStyle = '#1C1917'
  g.lineWidth = Math.max(1.5, r * 0.05)
  g.lineCap = 'round'
  g.beginPath()
  g.arc(0, r * 0.12, r * 0.22, Math.PI * 0.15, Math.PI * 0.85)
  g.stroke()
  // 腮紅
  g.globalAlpha = 0.35
  g.fillStyle = '#FB7185'
  for (const dir of [-1, 1]) {
    g.beginPath()
    g.ellipse(dir * r * 0.52, r * 0.12, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1

  g.restore()
}

/** 投放瞄準虛線 */
export function drawAimLine(g: CanvasRenderingContext2D, x: number) {
  g.save()
  g.strokeStyle = 'rgba(255, 255, 255, 0.25)'
  g.setLineDash([4, 10])
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(x, BOARD.dropY)
  g.lineTo(x, BOARD.height)
  g.stroke()
  g.restore()
}
