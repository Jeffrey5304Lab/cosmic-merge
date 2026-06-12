import './style.css'
import { Game } from './game'
import { BOARD, TIERS } from './planets'
import { drawPlanet } from './render'
import { isMuted, setMuted, startMusic } from './audio'
import { getLang, onLangChange, planetName, t, toggleLang } from './i18n'
import { shareCard } from './sharecard'
import { dailySeed, mulberry32 } from './logic'
import { addScore, loadLeaderboard, removeScore, type LeaderboardEntry } from './leaderboard'
import { ads } from './ads'
import { addHammer, getHammers, useHammer } from './inventory'

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
let lastRank: number | null = null

function renderLeaderboard() {
  $('board-title').textContent = t().leaderboard
  const list = $<HTMLOListElement>('board-list')
  list.innerHTML = ''
  const entries = loadLeaderboard().slice(0, 5)
  if (entries.length === 0) {
    const li = document.createElement('li')
    li.className = 'b-empty'
    li.textContent = t().noScores
    list.appendChild(li)
    return
  }
  entries.forEach((e, i) => {
    const li = document.createElement('li')
    if (lastRank !== null && i === lastRank - 1) li.className = 'me'
    const left = document.createElement('span')
    left.textContent = `${i + 1}. ${planetName(e.maxTier)}${e.mode === 'daily' ? ' 🗓️' : ''}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = String(e.score)
    li.append(left, right)
    list.appendChild(li)
  })
}

function renderGameOver() {
  if (!lastResult) return
  const { score, best, maxTier } = lastResult
  const name = planetName(maxTier)
  overTitleEl.textContent = t().overTitle
  overScoreEl.innerHTML = t().overScore(score)
  overEmojiEl.textContent = maxTier >= 10 ? '☀️' : maxTier >= 8 ? '🪐' : '💫'
  let sub = score >= best && score > 0 ? t().overNewRecord(name) : t().overNormal(name, best)
  if (mode === 'daily') sub += `・${t().dailyBest(Math.max(getDailyBest(), score))}`
  overSubEl.textContent = sub
  renderLeaderboard()
}

/* ── 模式：經典 / 每日挑戰 ── */
type Mode = 'classic' | 'daily'
let mode: Mode = 'classic'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDailyBest(): number {
  try {
    return Number(localStorage.getItem(`cosmic-merge:daily-best:${todayKey()}`)) || 0
  } catch {
    return 0
  }
}

function saveDailyBest(score: number) {
  try {
    const key = `cosmic-merge:daily-best:${todayKey()}`
    if (score > getDailyBest()) localStorage.setItem(key, String(score))
  } catch {
    /* 私密模式忽略 */
  }
}

/* ── 遊戲實例 ── */
const game = new Game({
  onScore(score, best) {
    popValue(scoreEl, score)
    // 每日挑戰模式：最佳欄顯示今日最佳
    bestEl.textContent = String(mode === 'daily' ? Math.max(getDailyBest(), score) : best)
  },
  onNext: renderNext,
  onCombo: showCombo,
  onGameOver(score, best, maxTier) {
    if (mode === 'daily') saveDailyBest(score)
    lastEntry = { score, maxTier, date: todayKey(), mode }
    lastRank = addScore(lastEntry)
    lastResult = { score, best, maxTier }
    reviveBtn.classList.toggle('hidden', game.reviveUsed || score === 0)
    renderGameOver()
    overlayEl.classList.remove('hidden')
  },
})

/* ── 復活（獎勵式廣告位） ── */
const reviveBtn = $<HTMLButtonElement>('revive')
let lastEntry: LeaderboardEntry | null = null

reviveBtn.addEventListener('click', async () => {
  reviveBtn.disabled = true
  const watched = await ads.showRewarded('revive')
  reviveBtn.disabled = false
  if (!watched || !game.revive()) return
  // 這局還沒結束：撤回剛記錄的排行榜成績，等真正結束再記
  if (lastEntry) {
    removeScore(lastEntry)
    lastEntry = null
  }
  lastResult = null
  overlayEl.classList.add('hidden')
})

/* ── 模式切換 ── */
const modeBtn = $<HTMLButtonElement>('mode')
const modeBadge = $<HTMLDivElement>('mode-badge')

function applyMode() {
  modeBtn.classList.toggle('active', mode === 'daily')
  modeBadge.classList.toggle('hidden', mode !== 'daily')
  modeBadge.textContent = `🗓️ ${t().daily}`
  overlayEl.classList.add('hidden')
  lastResult = null
  // 每日挑戰：日期種子 → 全世界今天同一套星球序列
  game.restart(mode === 'daily' ? mulberry32(dailySeed()) : Math.random)
}

modeBtn.addEventListener('click', () => {
  mode = mode === 'daily' ? 'classic' : 'daily'
  applyMode()
  modeBtn.blur()
})

/* ── 道具：換球 + 小錘子 ── */
const swapBtn = $<HTMLButtonElement>('swap')
const hammerBtn = $<HTMLButtonElement>('hammer')
const hammerCountEl = $<HTMLSpanElement>('hammer-count')
const hintEl = $<HTMLDivElement>('hint')
const hintTextEl = $<HTMLParagraphElement>('hint-text')
let smashMode = false

function refreshHammerCount() {
  hammerCountEl.textContent = String(getHammers())
}
refreshHammerCount()

function exitSmashMode() {
  smashMode = false
  hammerBtn.classList.remove('armed')
  hintEl.classList.add('hidden')
}

swapBtn.addEventListener('click', () => {
  game.swapNext()
  swapBtn.blur()
})

hammerBtn.addEventListener('click', async () => {
  hammerBtn.blur()
  if (smashMode) {
    exitSmashMode()
    return
  }
  if (getHammers() > 0) {
    smashMode = true
    hammerBtn.classList.add('armed')
    hintTextEl.textContent = t().hammerHint
    hintEl.classList.remove('hidden')
    return
  }
  // 沒庫存：看廣告拿一支
  hammerBtn.disabled = true
  const watched = await ads.showRewarded('hammer')
  hammerBtn.disabled = false
  if (watched) {
    addHammer()
    refreshHammerCount()
  }
})

const shareBtn = $<HTMLButtonElement>('share')
shareBtn.addEventListener('click', async () => {
  if (!lastResult) return
  const outcome = await shareCard(lastResult.score, lastResult.maxTier)
  if (outcome !== 'failed') {
    shareBtn.textContent = t().shareDone
    setTimeout(() => (shareBtn.textContent = t().share), 1800)
  }
})

$<HTMLButtonElement>('restart').addEventListener('click', () => {
  overlayEl.classList.add('hidden')
  lastResult = null
  lastEntry = null
  exitSmashMode()
  // 每日挑戰重開＝同一套今日序列
  game.restart(mode === 'daily' ? mulberry32(dailySeed()) : undefined)
})

muteBtn.textContent = isMuted() ? '🔇' : '🔊'
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  muteBtn.textContent = isMuted() ? '🔇' : '🔊'
  muteBtn.blur() // 之後按空白鍵是投放，不是再切音效
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
  shareBtn.textContent = d.share
  $<HTMLButtonElement>('restart').textContent = d.restart
  muteBtn.setAttribute('aria-label', d.mute)
  modeBtn.setAttribute('aria-label', d.daily)
  modeBadge.textContent = `🗓️ ${d.daily}`
  reviveBtn.textContent = d.revive
  swapBtn.setAttribute('aria-label', d.swap)
  hammerBtn.setAttribute('aria-label', d.hammer)
  if (smashMode) hintTextEl.textContent = d.hammerHint
  langBtn.textContent = d.langButton
  nextNameEl.textContent = planetName(lastNextTier)
  $('tutorial-text').innerHTML = d.tutorial
  renderChart()
  renderGameOver()
}

langBtn.addEventListener('click', () => {
  toggleLang()
  langBtn.blur()
})
onLangChange(applyI18n)

/* ── 指標操作：移動瞄準、放開投放（小錘子模式則是敲擊） ── */
function toBoardX(clientX: number): number {
  const rect = canvas.getBoundingClientRect()
  return ((clientX - rect.left) / rect.width) * BOARD.width
}

function toBoardY(clientY: number): number {
  const rect = canvas.getBoundingClientRect()
  return ((clientY - rect.top) / rect.height) * BOARD.height
}

canvas.addEventListener('pointerdown', e => {
  if (!smashMode) game.aim(toBoardX(e.clientX))
})
canvas.addEventListener('pointermove', e => {
  if (!smashMode) game.aim(toBoardX(e.clientX))
})
canvas.addEventListener('pointerup', e => {
  if (smashMode) {
    if (game.smash(toBoardX(e.clientX), toBoardY(e.clientY))) {
      useHammer()
      refreshHammerCount()
      exitSmashMode()
    }
    return
  }
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

/* ── BGM：第一次互動後啟動（autoplay 政策） ── */
window.addEventListener('pointerdown', () => startMusic(), { once: true })
window.addEventListener('keydown', () => startMusic(), { once: true })

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
