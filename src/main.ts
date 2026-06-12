import './style.css'
import { Game } from './game'
import { BOARD, TIERS } from './planets'
import { drawPlanet } from './render'
import { isMuted, setMuted } from './audio'

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`找不到元素 #${id}`)
  return el as T
}

const canvas = $<HTMLCanvasElement>('game')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('此瀏覽器不支援 Canvas 2D')

const scoreEl = $<HTMLSpanElement>('score')
const bestEl = $<HTMLSpanElement>('best')
const comboEl = $<HTMLDivElement>('combo')
const nextCanvas = $<HTMLCanvasElement>('next')
const nextNameEl = $<HTMLSpanElement>('next-name')
const overlayEl = $<HTMLDivElement>('gameover')
const finalScoreEl = $<HTMLElement>('final-score')
const overSubEl = $<HTMLParagraphElement>('over-sub')
const overEmojiEl = $<HTMLParagraphElement>('over-emoji')

const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = BOARD.width * dpr
canvas.height = BOARD.height * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

/* ── 下一顆預覽 ── */
function renderNext(tier: number) {
  const t = TIERS[tier]
  const g = nextCanvas.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, 120, 120)
  const scale = Math.min(1, 44 / t.radius)
  drawPlanet(g, t, 60, 60, 0, scale)
  nextNameEl.textContent = t.name
}

/* ── Combo 提示 ── */
let comboTimer = 0
function showCombo(multiplier: number) {
  if (multiplier < 2) return
  comboEl.textContent = `×${multiplier} COMBO!`
  comboEl.classList.remove('show')
  void comboEl.offsetWidth // 重新觸發動畫
  comboEl.classList.add('show')
  clearTimeout(comboTimer)
  comboTimer = window.setTimeout(() => comboEl.classList.remove('show'), 1200)
}

/* ── 遊戲實例 ── */
const game = new Game({
  onScore(score, best) {
    scoreEl.textContent = String(score)
    bestEl.textContent = String(best)
  },
  onNext: renderNext,
  onCombo: showCombo,
  onGameOver(score, best, maxTier) {
    finalScoreEl.textContent = String(score)
    const t = TIERS[maxTier]
    overEmojiEl.textContent = maxTier >= 10 ? '☀️' : maxTier >= 8 ? '🪐' : '💫'
    overSubEl.textContent =
      score >= best && score > 0
        ? `🏆 新紀錄！最高合成到「${t.name}」`
        : `最高合成到「${t.name}」，最佳紀錄 ${best} 分`
    overlayEl.classList.remove('hidden')
  },
})

$<HTMLButtonElement>('restart').addEventListener('click', () => {
  overlayEl.classList.add('hidden')
  game.restart()
})

const muteBtn = $<HTMLButtonElement>('mute')
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  muteBtn.textContent = isMuted() ? '🔇' : '🔊'
})

/* ── 指標操作：移動瞄準、放開投放 ── */
function toBoardX(clientX: number): number {
  const rect = canvas.getBoundingClientRect()
  return ((clientX - rect.left) / rect.width) * BOARD.width
}

canvas.addEventListener('pointerdown', e => game.aim(toBoardX(e.clientX)))
canvas.addEventListener('pointermove', e => game.aim(toBoardX(e.clientX)))
canvas.addEventListener('pointerup', e => {
  game.aim(toBoardX(e.clientX))
  game.drop()
})

/* ── 進化圖鑑 ── */
function renderChart() {
  const chart = $<HTMLCanvasElement>('chart')
  const g = chart.getContext('2d')
  if (!g) return
  const w = chart.width / TIERS.length
  TIERS.forEach((t, i) => {
    const scale = Math.min(1, (10 + i * 1.6) / t.radius)
    drawPlanet(g, t, w * i + w / 2, 30, 0, scale)
    g.fillStyle = '#94A3B8'
    g.font = "10px 'Noto Sans TC', sans-serif"
    g.textAlign = 'center'
    g.fillText(t.name, w * i + w / 2, 64)
  })
}
renderChart()

/* ── 主迴圈 ── */
let last = performance.now()
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1) // 切到背景分頁回來時避免大步進
  last = now
  game.update(dt)
  ctx!.clearRect(0, 0, BOARD.width, BOARD.height)
  game.draw(ctx!)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
