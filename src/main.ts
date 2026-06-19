import './style.css'
import { Game } from './game'
import { BOARD, TIERS } from './planets'
import { drawPlanet } from './render'
import { isMuted, setMuted, startMusic } from './audio'
import { planetName, STR } from './strings'
import { shareCard } from './sharecard'
import { addScore, loadLeaderboard, removeScore, type LeaderboardEntry } from './leaderboard'
import { REMOTE_ENABLED } from './config'
import { fetchTopScores, submitScore, type RemoteScoreEntry } from './scores-remote'
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
const bestMergeCanvas = $<HTMLCanvasElement>('bestmerge')
const bestMergeNameEl = $<HTMLSpanElement>('bestmerge-name')
const overlayEl = $<HTMLDivElement>('gameover')
const overTitleEl = $<HTMLHeadingElement>('over-title')
const overScoreEl = $<HTMLParagraphElement>('over-score')
const overSubEl = $<HTMLParagraphElement>('over-sub')
const overEmojiEl = $<HTMLParagraphElement>('over-emoji')
const muteBtn = $<HTMLButtonElement>('mute')
const nameInput = $<HTMLInputElement>('name-input')

/* ── 玩家名稱（記住在 localStorage） ── */
const NAME_KEY = 'cosmic-merge:name'
nameInput.placeholder = STR.namePlaceholder
nameInput.value = localStorage.getItem(NAME_KEY) ?? ''
nameInput.addEventListener('input', () => {
  try {
    localStorage.setItem(NAME_KEY, nameInput.value.trim().slice(0, 16))
  } catch {
    /* 私密模式忽略 */
  }
})

function getPlayerName(): string {
  return nameInput.value.trim().slice(0, 16)
}

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

/* ── 最高合成（左欄）：本局合成過的最大星球 ── */
let bestMergeTier = 0
function renderBestMerge(tier: number) {
  bestMergeTier = tier
  const g = bestMergeCanvas.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, 120, 120)
  if (tier <= 0) {
    bestMergeNameEl.textContent = '—'
    return
  }
  const def = TIERS[tier]
  const scale = Math.min(1, 44 / def.radius)
  drawPlanet(g, def, 60, 60, 0, scale)
  bestMergeNameEl.textContent = planetName(tier)
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

/* ── 結算內容 ── */
let lastResult: { score: number; best: number; maxTier: number } | null = null
let lastRank: number | null = null

function renderLeaderboard() {
  $('board-title').textContent = STR.leaderboard
  const list = $<HTMLOListElement>('board-list')
  list.innerHTML = ''
  const entries = loadLeaderboard().slice(0, 5)
  if (entries.length === 0) {
    const li = document.createElement('li')
    li.className = 'b-empty'
    li.textContent = STR.noScores
    list.appendChild(li)
    return
  }
  entries.forEach((e, i) => {
    const li = document.createElement('li')
    if (lastRank !== null && i === lastRank - 1) li.className = 'me'
    const left = document.createElement('span')
    left.textContent = `${i + 1}. ${e.name || planetName(e.maxTier)}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = String(e.score)
    li.append(left, right)
    list.appendChild(li)
  })
}

let globalLeaderboardRequestId = 0
async function renderGlobalLeaderboard(highlight: RemoteScoreEntry | null) {
  const requestId = ++globalLeaderboardRequestId
  $('board-title').textContent = STR.globalLeaderboard
  const list = $<HTMLOListElement>('board-list')
  const entries = await fetchTopScores(10)
  // 慢的舊請求在新請求之後才回來：放棄，避免覆蓋掉較新的榜況
  if (requestId !== globalLeaderboardRequestId) return
  list.innerHTML = ''
  if (entries.length === 0) {
    const li = document.createElement('li')
    li.className = 'b-empty'
    li.textContent = STR.noScores
    list.appendChild(li)
    return
  }
  entries.forEach((e, i) => {
    const li = document.createElement('li')
    if (
      highlight &&
      e.name === highlight.name &&
      e.score === highlight.score &&
      e.maxTier === highlight.maxTier
    ) {
      li.className = 'me'
    }
    const left = document.createElement('span')
    left.textContent = `${i + 1}. ${e.name}`
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
  overTitleEl.textContent = STR.overTitle
  overScoreEl.innerHTML = STR.overScore(score)
  overEmojiEl.textContent = maxTier >= 10 ? '☀️' : maxTier >= 8 ? '🪐' : '💫'
  const sub = score >= best && score > 0 ? STR.overNewRecord(name) : STR.overNormal(name, best)
  overSubEl.textContent = sub
  if (!REMOTE_ENABLED) renderLeaderboard()
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── 遊戲實例 ── */
const game = new Game({
  onScore(score, best, maxTier) {
    popValue(scoreEl, score)
    bestEl.textContent = String(best)
    if (maxTier !== bestMergeTier) renderBestMerge(maxTier)
  },
  onNext: renderNext,
  onCombo: showCombo,
  onGameOver(score, best, maxTier) {
    const name = getPlayerName()
    lastEntry = { score, maxTier, date: todayKey(), name: name || undefined, id: crypto.randomUUID() }
    lastRank = addScore(lastEntry)
    lastResult = { score, best, maxTier }
    const canRevive = !game.reviveUsed && score > 0
    reviveBtn.classList.toggle('hidden', !canRevive)
    renderGameOver()
    overlayEl.classList.remove('hidden')

    if (REMOTE_ENABLED) {
      const remoteEntry: RemoteScoreEntry = { name: name || 'Anonymous', score, maxTier }
      if (canRevive) {
        pendingRemoteEntry = remoteEntry
        void renderGlobalLeaderboard(null)
      } else {
        // 用本次（復活後最終）成績送出，不是復活前暫存的舊分數
        const toSubmit = remoteEntry
        pendingRemoteEntry = null
        void (async () => {
          await submitScore(toSubmit.name, toSubmit.score, toSubmit.maxTier)
          await renderGlobalLeaderboard(toSubmit)
        })()
      }
    }
  },
})

/* ── 復活（獎勵式廣告位） ── */
const reviveBtn = $<HTMLButtonElement>('revive')
let lastEntry: LeaderboardEntry | null = null
let pendingRemoteEntry: RemoteScoreEntry | null = null

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

/* ── 道具：小錘子 ── */
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

hammerBtn.addEventListener('click', async () => {
  hammerBtn.blur()
  if (smashMode) {
    exitSmashMode()
    return
  }
  if (getHammers() > 0) {
    smashMode = true
    hammerBtn.classList.add('armed')
    hintTextEl.textContent = STR.hammerHint
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
    shareBtn.textContent = STR.shareDone
    setTimeout(() => (shareBtn.textContent = STR.share), 1800)
  }
})

$<HTMLButtonElement>('restart').addEventListener('click', () => {
  overlayEl.classList.add('hidden')
  lastResult = null
  lastEntry = null
  if (pendingRemoteEntry) {
    const toSubmit = pendingRemoteEntry
    pendingRemoteEntry = null
    void submitScore(toSubmit.name, toSubmit.score, toSubmit.maxTier)
  }
  exitSmashMode()
  game.restart()
})

muteBtn.classList.toggle('muted', isMuted())
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  muteBtn.classList.toggle('muted', isMuted())
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

/* ── UI 文字（英文單語系，啟動時套用一次） ── */
function applyStrings() {
  document.title = STR.docTitle
  $('title-1').textContent = STR.title1
  $('title-2').textContent = STR.title2
  $('label-score').textContent = STR.score
  $('label-best').textContent = STR.best
  $('label-next').textContent = STR.next
  $('label-bestmerge').textContent = STR.bestMerge
  $('label-evolution').textContent = STR.evolution
  shareBtn.textContent = STR.share
  $<HTMLButtonElement>('restart').textContent = STR.restart
  muteBtn.setAttribute('aria-label', STR.mute)
  reviveBtn.textContent = STR.revive
  hammerBtn.setAttribute('aria-label', STR.hammer)
  nextNameEl.textContent = planetName(lastNextTier)
  renderBestMerge(bestMergeTier)
  $('tutorial-text').innerHTML = STR.tutorial
  renderChart()
  renderGameOver()
}

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
    g.font = "bold 10px system-ui, sans-serif"
    g.textAlign = 'center'
    g.fillText(planetName(i), w * i + w / 2, 64)
  })
}

applyStrings()

/* ── BGM：第一次互動後啟動（autoplay 政策） ── */
window.addEventListener('pointerdown', () => startMusic(), { once: true })
window.addEventListener('keydown', () => startMusic(), { once: true })

/* ── PWA 離線（只在正式版註冊，避免 dev 快取干擾） ── */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // 新版 SW（skipWaiting + clients.claim）接管時自動重整一次，
  // 讓使用者打開網站就拿到最新版，不必手動關分頁。
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* SW 註冊失敗不影響遊戲 */
    })
  })
}

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
