import type { PlanetTier } from './planets'
import { BOARD } from './planets'

/** 背景星星（緩慢閃爍） */
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

export function drawBackground(g: CanvasRenderingContext2D, stars: Star[], time: number) {
  const grad = g.createLinearGradient(0, 0, 0, BOARD.height)
  grad.addColorStop(0, '#0B0B1E')
  grad.addColorStop(0.6, '#141432')
  grad.addColorStop(1, '#1B1040')
  g.fillStyle = grad
  g.fillRect(0, 0, BOARD.width, BOARD.height)

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

/** 警戒線（接近時呼吸提醒） */
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

/**
 * 畫一顆 chibi 星球：徑向漸層球體 + 高光 + 可愛表情。
 * wobble 用於合成出生的彈跳縮放。
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

  // 太陽光暈
  if (tier.glow) {
    const glow = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.8)
    glow.addColorStop(0, 'rgba(253, 224, 71, 0.45)')
    glow.addColorStop(1, 'rgba(253, 224, 71, 0)')
    g.fillStyle = glow
    g.beginPath()
    g.arc(0, 0, r * 1.8, 0, Math.PI * 2)
    g.fill()
  }

  // 行星環（後半，畫在球體下層）
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

  // 粗邊框（chibi 風格）
  g.strokeStyle = 'rgba(15, 10, 40, 0.55)'
  g.lineWidth = Math.max(2, r * 0.07)
  g.stroke()

  // 表面斑點增加質感
  g.globalAlpha = 0.18
  g.fillStyle = tier.edge
  g.beginPath()
  g.arc(-r * 0.3, r * 0.25, r * 0.22, 0, Math.PI * 2)
  g.arc(r * 0.35, -r * 0.1, r * 0.15, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1

  g.rotate(-angle) // 臉永遠朝上，比較可愛

  // 行星環（前半，畫在球體上層）
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
