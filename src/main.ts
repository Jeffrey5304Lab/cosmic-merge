import './style.css'
import { Game } from './game'
import { BOARD, TIERS } from './planets'
import { drawPlanet } from './render'
import { isMuted, setMuted, startMusic } from './audio'
import { planetName, STR } from './strings'
import { shareCard } from './sharecard'
import { addScore, loadLeaderboard, removeScore, type LeaderboardEntry } from './leaderboard'
import { COUNTRY_CODES, countryName, flagEmoji, guessCountry } from './country'
import { loadStats, recordCombo, recordGame, recordMerge } from './stats'
import { ACHIEVEMENTS, evaluateAchievements, loadUnlocked } from './achievements'
import { REMOTE_ENABLED } from './config'
import { fetchRank, fetchTopScores, submitScore, type RemoteScoreEntry } from './scores-remote'
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
const overRankEl = $<HTMLParagraphElement>('over-rank')
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

/* ── 玩家國家（記住在 localStorage，預設用瀏覽器語系猜） ── */
const COUNTRY_KEY = 'cosmic-merge:country'
const countrySelect = $<HTMLSelectElement>('country-select')
{
  const blank = document.createElement('option')
  blank.value = ''
  blank.textContent = '🏳️ —'
  countrySelect.appendChild(blank)
  const sorted = COUNTRY_CODES.map(code => ({ code, name: countryName(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  for (const { code, name } of sorted) {
    const opt = document.createElement('option')
    opt.value = code
    opt.textContent = `${flagEmoji(code)} ${name}`
    countrySelect.appendChild(opt)
  }
  const saved = localStorage.getItem(COUNTRY_KEY)
  countrySelect.value = saved ?? guessCountry()
  countrySelect.addEventListener('change', () => {
    try {
      localStorage.setItem(COUNTRY_KEY, countrySelect.value)
    } catch {
      /* 私密模式忽略 */
    }
  })
}

function getCountry(): string {
  return countrySelect.value
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

/** 分數加千分位（2334 → 2,334），讓大數字好讀 */
const fmt = (n: number) => n.toLocaleString('en-US')

/* ── 分數跳動 ── */
function popValue(el: HTMLElement, value: number) {
  const text = fmt(value)
  if (el.textContent !== text) {
    el.textContent = text
    el.classList.remove('pop')
    void el.offsetWidth
    el.classList.add('pop')
  }
}

/* ── 結算內容 ── */
let lastResult: { score: number; best: number; maxTier: number } | null = null
let lastRank: number | null = null

/** 名次前綴：前三名給獎牌，其餘給數字 */
function medal(i: number): string {
  return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
}

/** 國旗前綴（含尾隨空格）；無國家時回空字串 */
function flagPrefix(country?: string): string {
  const f = flagEmoji(country)
  return f ? `${f} ` : ''
}

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
    left.textContent = `${medal(i)} ${flagPrefix(e.country)}${e.name || planetName(e.maxTier)}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = fmt(e.score)
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
    left.textContent = `${medal(i)} ${flagPrefix(e.country)}${e.name}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = fmt(e.score)
    li.append(left, right)
    list.appendChild(li)
  })
}

/** 結算的名次／差距那行（再 N 分超越上一名）；text=null 時隱藏 */
function setRankLine(text: string | null) {
  overRankEl.textContent = text ?? ''
  overRankEl.classList.toggle('hidden', !text)
}

let rankRequestId = 0
async function showGlobalRank(score: number) {
  const reqId = ++rankRequestId
  const info = await fetchRank(score)
  if (reqId !== rankRequestId) return // 較舊的請求晚回：放棄
  if (!info) return setRankLine(null)
  setRankLine(
    info.gap === null || info.rank <= 1
      ? STR.rankTop
      : `${STR.rankGlobal(info.rank)} · ${STR.rankGap(info.gap)}`,
  )
}

/** 本地榜的名次／差距（離線或未設定 Supabase 時） */
function showLocalRank(score: number) {
  if (lastRank === null) return setRankLine(null)
  const board = loadLeaderboard()
  const above = lastRank >= 2 ? board[lastRank - 2] : null
  const gap = above ? above.score - score : null
  setRankLine(gap === null ? STR.rankTopLocal : `${STR.rankLocal(lastRank)} · ${STR.rankGap(gap)}`)
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
  if (REMOTE_ENABLED) {
    setRankLine(null) // 全球名次稍後非同步補上
  } else {
    renderLeaderboard()
    showLocalRank(score)
  }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── 遊戲實例 ── */
const game = new Game({
  onScore(score, best, maxTier) {
    popValue(scoreEl, score)
    bestEl.textContent = fmt(best)
    if (maxTier !== bestMergeTier) renderBestMerge(maxTier)
  },
  onNext: renderNext,
  onCombo: showCombo,
  onMerge(resultTier, multiplier) {
    recordMerge(resultTier)
    recordCombo(multiplier)
    checkAchievements()
  },
  onGameOver(score, best, maxTier) {
    recordGame(score, maxTier)
    checkAchievements()
    const name = getPlayerName()
    const country = getCountry()
    lastEntry = {
      score,
      maxTier,
      date: todayKey(),
      name: name || undefined,
      country: country || undefined,
      id: crypto.randomUUID(),
    }
    lastRank = addScore(lastEntry)
    lastResult = { score, best, maxTier }
    const canRevive = !game.reviveUsed && score > 0
    reviveBtn.classList.toggle('hidden', !canRevive)
    renderGameOver()
    overlayEl.classList.remove('hidden')

    if (REMOTE_ENABLED) {
      const remoteEntry: RemoteScoreEntry = {
        name: name || 'Anonymous',
        score,
        maxTier,
        country: country || undefined,
      }
      if (canRevive) {
        pendingRemoteEntry = remoteEntry
        void renderGlobalLeaderboard(null)
        // 名次只是查詢（不寫入），復活前先讓玩家看到目前會排到第幾
        void showGlobalRank(score)
      } else {
        // 用本次（復活後最終）成績送出，不是復活前暫存的舊分數
        const toSubmit = remoteEntry
        pendingRemoteEntry = null
        void (async () => {
          await submitScore(toSubmit.name, toSubmit.score, toSubmit.maxTier, toSubmit.country)
          await Promise.all([renderGlobalLeaderboard(toSubmit), showGlobalRank(toSubmit.score)])
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
    void submitScore(toSubmit.name, toSubmit.score, toSubmit.maxTier, toSubmit.country)
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
  // 焦點在輸入欄/選單時把鍵盤讓給表單：名字才能打空白、方向鍵才能選國家
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
  // modal 開著時 Esc 關閉（在暫停守門之前處理，否則被擋掉）
  if (e.key === 'Escape' && paused) {
    setModal(null)
    e.preventDefault()
    return
  }
  // 排行榜開著（物理已暫停）時不接受瞄準／投放，免得在凍結畫面後面偷偷掉球
  if (paused) return
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

/* ── 排行榜 modal（遊戲中可查看；開啟時暫停物理，畫面凍結） ── */
const leaderboardModal = $<HTMLDivElement>('leaderboard-modal')
const lbTitleEl = $<HTMLSpanElement>('lb-title')
const lbListEl = $<HTMLOListElement>('lb-list')
const leaderboardBtn = $<HTMLButtonElement>('leaderboard-btn')
const lbTabsEl = $<HTMLDivElement>('lb-tabs')
const lbTabGlobal = $<HTMLButtonElement>('lb-tab-global')
const lbTabMine = $<HTMLButtonElement>('lb-tab-mine')
const achvModal = $<HTMLDivElement>('achv-modal')
let paused = false
let lbRequestId = 0
let lbMode: 'global' | 'mine' = 'global'

/** 同時管理兩個 modal：一次只開一個，開著就暫停物理（畫面凍結） */
function setModal(which: 'leaderboard' | 'achv' | null) {
  leaderboardModal.classList.toggle('hidden', which !== 'leaderboard')
  achvModal.classList.toggle('hidden', which !== 'achv')
  paused = which !== null
}

function fillBoard(
  list: HTMLOListElement,
  entries: { name?: string; score: number; maxTier: number; country?: string }[],
) {
  list.innerHTML = ''
  if (entries.length === 0) {
    const li = document.createElement('li')
    li.className = 'b-empty'
    li.textContent = STR.noScores
    list.appendChild(li)
    return
  }
  const me = getPlayerName()
  entries.forEach((e, i) => {
    const li = document.createElement('li')
    if (me && e.name === me) li.className = 'me' // 高亮自己（同名都算）
    const left = document.createElement('span')
    left.textContent = `${medal(i)} ${flagPrefix(e.country)}${e.name || planetName(e.maxTier)}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = fmt(e.score)
    li.append(left, right)
    list.appendChild(li)
  })
}

async function renderModalLeaderboard() {
  if (!REMOTE_ENABLED) {
    lbTitleEl.textContent = STR.leaderboard
    fillBoard(lbListEl, loadLeaderboard().slice(0, 10))
    return
  }
  const country = getCountry()
  const mine = lbMode === 'mine' && country
  lbTitleEl.textContent = mine
    ? `${flagEmoji(country)} ${countryName(country).toUpperCase()} TOP`
    : STR.globalLeaderboard
  const reqId = ++lbRequestId
  lbListEl.innerHTML = '<li class="b-empty">…</li>'
  const entries = await fetchTopScores(10, mine ? country : undefined)
  if (reqId !== lbRequestId) return // 舊請求慢回：放棄，避免覆蓋新榜
  fillBoard(lbListEl, entries)
}

/** 依現況更新分頁列：離線或未選國家時隱藏分頁，回到全球 */
function syncTabs() {
  const country = getCountry()
  const showTabs = REMOTE_ENABLED && !!country
  lbTabsEl.classList.toggle('hidden', !showTabs)
  if (!showTabs) lbMode = 'global'
  lbTabMine.textContent = country ? `${flagEmoji(country)} My country` : 'My country'
  lbTabGlobal.classList.toggle('active', lbMode === 'global')
  lbTabMine.classList.toggle('active', lbMode === 'mine')
}

function setLbMode(mode: 'global' | 'mine') {
  lbMode = mode
  syncTabs()
  void renderModalLeaderboard()
}

function openLeaderboard() {
  setModal('leaderboard')
  syncTabs()
  void renderModalLeaderboard()
}
function closeLeaderboard() {
  setModal(null)
}

leaderboardBtn.addEventListener('click', () => {
  leaderboardBtn.blur()
  openLeaderboard()
})
lbTabGlobal.addEventListener('click', () => setLbMode('global'))
lbTabMine.addEventListener('click', () => setLbMode('mine'))
$<HTMLButtonElement>('lb-close').addEventListener('click', closeLeaderboard)
leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) closeLeaderboard() // 點背景關閉
})

/* ── 統計與成就 modal ── */
const achvBtn = $<HTMLButtonElement>('achv-btn')
const statsGridEl = $<HTMLDivElement>('stats-grid')
const achvListEl = $<HTMLUListElement>('achv-list')
const achvToastEl = $<HTMLDivElement>('achv-toast')

function renderAchievements() {
  const s = loadStats()
  const cells: [string, string][] = [
    ['Games', fmt(s.games)],
    ['Best', fmt(s.bestScore)],
    ['Top planet', s.maxTier > 0 ? planetName(s.maxTier) : '—'],
    ['Best combo', s.bestCombo > 1 ? `×${s.bestCombo}` : '—'],
    ['Merges', fmt(s.totalMerges)],
    ['Suns', fmt(s.suns)],
  ]
  statsGridEl.innerHTML = ''
  for (const [k, v] of cells) {
    const cell = document.createElement('div')
    cell.className = 'stat-mini'
    const vv = document.createElement('span')
    vv.className = 'v'
    vv.textContent = v
    const kk = document.createElement('span')
    kk.className = 'k'
    kk.textContent = k
    cell.append(vv, kk)
    statsGridEl.appendChild(cell)
  }
  const unlocked = loadUnlocked()
  achvListEl.innerHTML = ''
  for (const a of ACHIEVEMENTS) {
    const got = unlocked.has(a.id)
    const li = document.createElement('li')
    li.className = got ? 'achv-row' : 'achv-row locked'
    li.innerHTML =
      `<span class="ico">${a.icon}</span>` +
      `<span class="meta"><span class="nm"></span><span class="ds"></span></span>` +
      (got ? '<span class="done">✓</span>' : '')
    li.querySelector('.nm')!.textContent = a.name
    li.querySelector('.ds')!.textContent = a.desc
    achvListEl.appendChild(li)
  }
}

function openAchievements() {
  setModal('achv')
  renderAchievements()
}

achvBtn.addEventListener('click', () => {
  achvBtn.blur()
  openAchievements()
})
$<HTMLButtonElement>('achv-close').addEventListener('click', () => setModal(null))
achvModal.addEventListener('click', (e) => {
  if (e.target === achvModal) setModal(null) // 點背景關閉
})

/* ── 成就解鎖提示（toast，依序播放） ── */
const toastQueue: string[] = []
let toastBusy = false
function pumpToasts() {
  if (toastBusy) return
  const text = toastQueue.shift()
  if (!text) return
  toastBusy = true
  achvToastEl.textContent = text
  achvToastEl.classList.add('show')
  window.setTimeout(() => {
    achvToastEl.classList.remove('show')
    window.setTimeout(() => {
      toastBusy = false
      pumpToasts()
    }, 350)
  }, 2200)
}

/** 依目前統計檢查成就，新解鎖的排入提示 */
function checkAchievements() {
  for (const a of evaluateAchievements(loadStats())) {
    toastQueue.push(`${a.icon} Achievement: ${a.name}!`)
  }
  pumpToasts()
}

/* ── 主迴圈 ── */
let last = performance.now()
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1) // 切到背景分頁回來時避免大步進
  last = now
  if (!paused) game.update(dt)
  ctx!.clearRect(0, 0, BOARD.width, BOARD.height)
  game.draw(ctx!)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
