import './style.css'
import { Game } from './game'
import { BOARD, TIERS } from './planets'
import { drawPlanet } from './render'
import { isMuted, setMuted } from './audio'
import { getLang, onLangChange, planetName, t, toggleLang } from './i18n'

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
const overTitleEl = $<HTMLHeadingElement>('over-title')
const overScoreEl = $<HTMLParagraphElement>('over-score')
const overSubEl = $<HTMLParagraphElement>('over-sub')
const overEmojiEl = $<HTMLParagraphElement>('over-emoji')
const langBtn = $<HTMLButtonElement>('lang')
const muteBtn = $<HTMLButtonElement>('mute')

const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = BOARD.width * dpr
canvas.height = BOARD.height * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

/* ── 下一顆預覽 ── */
let lastNextTier = 0
function renderNext(tier: number) {
  lastNextTier = tier
  const def = TIERS[tier]
  const g = nextCanvas.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, 120, 120)
  const scale = Math.min(1, 44 / def.radius)
  drawPlanet(g, def, 60, 60, 0, scale)
  nextNameEl.textContent = planetName(tier)
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

/* ── 分數跳動 ── */
function popValue(el: HTMLElement, value: number) {
  if (el.textContent !== String(value)) {
    el.textContent = String(value)
    el.classList.remove('pop')
    void el.offsetWidth
    el.classList.add('pop')
  }
}

/* ── 結算內容（語言切換時需要重畫） ── */
let lastResult: { score: number; best: number; maxTier: number } | null = null
function renderGameOver() {
  if (!lastResult) return
  const { score, best, maxTier } = lastResult
  const name = planetName(maxTier)
  overTitleEl.textContent = t().overTitle
  overScoreEl.innerHTML = t().overScore(score)
  overEmojiEl.textContent = maxTier >= 10 ? '☀️' : maxTier >= 8 ? '🪐' : '💫'
  overSubEl.textContent =
    score >= best && score > 0 ? t().overNewRecord(name) : t().overNormal(name, best)
}

/* ── 遊戲實例 ── */
const game = new Game({
  onScore(score, best) {
    popValue(scoreEl, score)
    bestEl.textContent = String(best)
  },
  onNext: renderNext,
  onCombo: showCombo,
  onGameOver(score, best, maxTier) {
    lastResult = { score, best, maxTier }
    renderGameOver()
    overlayEl.classList.remove('hidden')
  },
})

$<HTMLButtonElement>('restart').addEventListener('click', () => {
  overlayEl.classList.add('hidden')
  lastResult = null
  game.restart()
})

muteBtn.textContent = isMuted() ? '🔇' : '🔊'
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  muteBtn.textContent = isMuted() ? '🔇' : '🔊'
})

/* ── 新手教學：第一次玩才顯示，投放後收起 ── */
const TUTORIAL_KEY = 'cosmic-merge:tutorial-seen'
const tutorialEl = $<HTMLDivElement>('tutorial')
let tutorialVisible = false
try {
  tutorialVisible = !localStorage.getItem(TUTORIAL_KEY)
} catch {
  tutorialVisible = true
}
if (tutorialVisible) tutorialEl.classList.remove('hidden')

function dismissTutorial() {
  if (!tutorialVisible) return
  tutorialVisible = false
  tutorialEl.classList.add('hidden')
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    /* 私密模式忽略 */
  }
}

/* ── 多語系 ── */
function applyI18n() {
  const d = t()
  document.documentElement.lang = getLang()
  document.title = d.docTitle
  $('title-1').textContent = d.title1
  $('title-2').textContent = d.title2
  $('label-score').textContent = d.score
  $('label-best').textContent = d.best
  $('label-next').textContent = d.next
  $('label-evolution').textContent = d.evolution
  muteBtn.setAttribute('aria-label', d.mute)
  langBtn.textContent = d.langButton
  nextNameEl.textContent = planetName(lastNextTier)
  $('tutorial-text').innerHTML = d.tutorial
  renderChart()
  renderGameOver()
}

langBtn.addEventListener('click', toggleLang)
onLangChange(applyI18n)

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
  dismissTutorial()
})

/* ── 鍵盤操作：← → 瞄準、空白鍵投放 ── */
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') {
    game.aim(game.aimPosition - 14)
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    game.aim(game.aimPosition + 14)
    e.preventDefault()
  } else if (e.key === ' ' || e.key === 'ArrowDown') {
    game.drop()
    dismissTutorial()
    e.preventDefault()
  }
})

/* ── 進化圖鑑 ── */
function renderChart() {
  const chart = $<HTMLCanvasElement>('chart')
  const g = chart.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, chart.width, chart.height)
  const w = chart.width / TIERS.length
  TIERS.forEach((def, i) => {
    const scale = Math.min(1, (10 + i * 1.6) / def.radius)
    drawPlanet(g, def, w * i + w / 2, 30, 0, scale)
    g.fillStyle = '#6B5844'
    g.font = "bold 10px 'Noto Sans TC', sans-serif"
    g.textAlign = 'center'
    g.fillText(planetName(i), w * i + w / 2, 64)
  })
}

applyI18n()

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
