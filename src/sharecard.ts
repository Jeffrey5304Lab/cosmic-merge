/** 成績分享卡：用 Canvas 畫一張 cozy 風格的成績圖，走原生分享或下載 */
import { TIERS } from './planets'
import { drawPlanet } from './render'
import { planetName, STR } from './strings'

const W = 720
const H = 900

export function renderShareCard(score: number, maxTier: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return canvas

  // 奶油紙底
  g.fillStyle = '#F4E9D7'
  g.fillRect(0, 0, W, H)
  // 紙張顆粒
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(59,48,36,0.06)'
    g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }

  // 繪本夜空圓角面板
  const px = 50
  const py = 150
  const pw = W - px * 2
  const ph = 520
  g.save()
  g.beginPath()
  g.roundRect(px, py, pw, ph, 26)
  g.fillStyle = '#414968'
  g.fill()
  g.clip()
  // 星星
  g.fillStyle = '#F6EAC9'
  for (let i = 0; i < 60; i++) {
    g.globalAlpha = 0.3 + Math.random() * 0.7
    g.beginPath()
    g.arc(px + Math.random() * pw, py + Math.random() * ph, 1 + Math.random() * 1.6, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  // 主角：最高合成星球
  const tier = TIERS[maxTier]
  const scale = Math.min(1.5, 170 / tier.radius)
  drawPlanet(g, tier, W / 2, py + ph / 2 - 20, 0, scale, 2)
  // 星球名
  g.font = "bold 38px system-ui, sans-serif"
  g.textAlign = 'center'
  g.fillStyle = '#F6EAC9'
  g.fillText(planetName(maxTier), W / 2, py + ph - 46)
  g.restore()

  // 面板墨水框
  g.strokeStyle = '#3B3024'
  g.lineWidth = 5
  g.beginPath()
  g.roundRect(px, py, pw, ph, 26)
  g.stroke()

  // 標題
  g.font = "64px 'Gochi Hand', cursive"
  g.textAlign = 'center'
  g.fillStyle = '#3B3024'
  g.fillText('Cosmic Merge', W / 2, 100)

  // 分數
  g.font = "bold 26px system-ui, sans-serif"
  g.fillStyle = '#9C8B76'
  g.fillText(STR.score, W / 2, py + ph + 78)
  g.font = "92px 'Gochi Hand', cursive"
  g.fillStyle = '#E07A5F'
  g.fillText(score.toLocaleString('en-US'), W / 2, py + ph + 162) // 千分位，與遊戲內一致

  // 日期
  g.font = "22px system-ui, sans-serif"
  g.fillStyle = '#9C8B76'
  g.fillText(new Date().toLocaleDateString(), W / 2, H - 26)

  return canvas
}

/** 手機走原生分享、桌面直接下載 PNG */
export async function shareCard(score: number, maxTier: number): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const canvas = renderShareCard(score, maxTier)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return 'failed'

    const file = new File([blob], 'cosmic-merge-score.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Cosmic Merge' })
      return 'shared'
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cosmic-merge-score.png'
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch {
    // 使用者取消分享也會走到這，不視為錯誤崩潰
    return 'failed'
  }
}
