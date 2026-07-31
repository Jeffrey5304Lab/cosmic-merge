import './style.css'
import { Game } from './game'
import { BOARD, SUN_TIER, TIERS } from './planets'
import { discoveredCount } from './discovery'
import { drawPlanet } from './render'
import { isMuted, setMuted, startMusic } from './audio'
import { planetName, STR } from './strings'
import { shareCard } from './sharecard'
import { addScore, loadLeaderboard, removeScore, type LeaderboardEntry } from './leaderboard'
import { COUNTRY_CODES, countryName, flagEmoji, guessCountry } from './country'
import { loadStats, recordCombo, recordDiscovery, recordGame, recordMerge, recordSupernova, undoGameCount } from './stats'
import { ACHIEVEMENTS, evaluateAchievements, loadUnlocked } from './achievements'
import { REMOTE_ENABLED } from './config'
import { fetchRank, fetchTopScores, submitScore, type RemoteScoreEntry } from './scores-remote'
import { ads } from './ads'
import { addHammer, getHammers, refillFreeHammers, useHammer } from './inventory'
import { Capacitor } from '@capacitor/core'

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
  // 結算畫面打字時即時更新榜上自己那筆的名字
  if (REMOTE_ENABLED && lastResult) renderBoardRows()
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
    // 結算畫面換國家時即時更新榜上自己那筆的國旗
    if (REMOTE_ENABLED && lastResult) renderBoardRows()
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

/* ── 發現新恆星橫幅 ── */
const discoverEl = $<HTMLDivElement>('discover')
let discoverTimer = 0
function showDiscoverBanner(name: string) {
  discoverEl.textContent = STR.newStarBanner(name)
  discoverEl.classList.remove('show')
  void discoverEl.offsetWidth // 重新觸發動畫
  discoverEl.classList.add('show')
  clearTimeout(discoverTimer)
  discoverTimer = window.setTimeout(() => discoverEl.classList.remove('show'), 3200)
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
let lastFetched: RemoteScoreEntry[] = []

/** 本局成績用即時輸入的名字/國家樂觀顯示在榜上（結算畫面存活期間都在，
 *  綁定 lastResult 而非 pendingSubmit——按下送出後仍要留著自己那列，不能消失） */
function ownPendingEntry(): RemoteScoreEntry | null {
  if (!lastResult || lastResult.score <= 0) return null
  return {
    name: getPlayerName() || 'Anonymous',
    score: lastResult.score,
    maxTier: lastResult.maxTier,
    country: getCountry() || undefined,
  }
}

/** 用快取的榜單 + 樂觀本局成績重畫結算排行榜（不重新抓，給打字即時更新用） */
function renderBoardRows() {
  $('board-title').textContent = STR.globalLeaderboard
  const list = $<HTMLOListElement>('board-list')
  const own = ownPendingEntry()
  const rows = own ? [...lastFetched, own].sort((a, b) => b.score - a.score).slice(0, 10) : lastFetched
  list.innerHTML = ''
  if (rows.length === 0) {
    const li = document.createElement('li')
    li.className = 'b-empty'
    li.textContent = STR.noScores
    list.appendChild(li)
    return
  }
  rows.forEach((e, i) => {
    const li = document.createElement('li')
    if (e === own) li.className = 'me' // 樂觀插入的本局那筆
    const left = document.createElement('span')
    left.textContent = `${medal(i)} ${flagPrefix(e.country)}${e.name}`
    const right = document.createElement('span')
    right.className = 'b-score'
    right.textContent = fmt(e.score)
    li.append(left, right)
    list.appendChild(li)
  })
}

async function renderGlobalLeaderboard() {
  const requestId = ++globalLeaderboardRequestId
  const entries = await fetchTopScores(10)
  // 慢的舊請求在新請求之後才回來：放棄，避免覆蓋掉較新的榜況
  if (requestId !== globalLeaderboardRequestId) return
  // 連不上時 entries 為 null：保留上次快取（不覆蓋成空白），但仍重繪，
  // 讓本局樂觀插入的那筆照樣顯示，玩家不會對著空榜卡住
  if (entries !== null) lastFetched = entries
  renderBoardRows()
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
  overEmojiEl.textContent = maxTier >= 11 ? '🌟' : maxTier >= 10 ? '☀️' : maxTier >= 8 ? '🪐' : '💫'
  const sub = score >= best && score > 0 ? STR.overNewRecord(name) : STR.overNormal(name, best)
  overSubEl.textContent = sub
  if (REMOTE_ENABLED) {
    setRankLine(null) // 全球名次稍後非同步補上
    resetSubmitButton(score)
  } else {
    renderLeaderboard()
    showLocalRank(score)
  }
}

/** 每次結算重置「送出到排行榜」按鈕：有分數才顯示、恢復可按狀態 */
function resetSubmitButton(score: number) {
  submitBtn.classList.toggle('hidden', score <= 0)
  submitBtn.disabled = false
  submitBtn.textContent = STR.submitScore
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
    if (resultTier === SUN_TIER) maybeShowBlackHoleGoal() // 首次做出太陽 → 揭示黑洞目標
  },
  onSupernova(multiplier) {
    recordSupernova()
    recordCombo(multiplier)
    checkAchievements()
  },
  onDiscover(tier) {
    recordDiscovery(tier)
    checkAchievements()
    setChartMode('stars', true) // 自動切到恆星圖鑑點亮新發現，幾秒後切回
    showDiscoverBanner(planetName(tier))
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
    // 先不送出 DB：等玩家填完名字、按 Play Again 或離開分頁才送（見 flushPendingScore）
    pendingSubmit = { score, maxTier }
    renderGameOver()
    overlayEl.classList.remove('hidden')

    if (REMOTE_ENABLED) {
      // 樂觀把本局成績插進榜上（用即時名字），名次用唯讀查詢即時算
      void renderGlobalLeaderboard()
      void showGlobalRank(score)
    }
  },
})

/* ── 復活（獎勵式廣告位） ── */
const reviveBtn = $<HTMLButtonElement>('revive')
let lastEntry: LeaderboardEntry | null = null
/** 本局結算的成績，等玩家填完名字、離開結算畫面才送出（避免送出空名字） */
let pendingSubmit: { score: number; maxTier: number } | null = null

/** 用此刻填好的名字/國家把本局成績寫出去（本機 + 全球）；只送一次 */
function flushPendingScore() {
  if (!pendingSubmit) return
  const { score, maxTier } = pendingSubmit
  pendingSubmit = null
  const name = getPlayerName()
  const country = getCountry()
  // 同步更新本機那筆的名字/國家（遊戲結束當下可能還沒填）
  if (lastEntry) {
    removeScore(lastEntry)
    lastEntry = { ...lastEntry, name: name || undefined, country: country || undefined }
    addScore(lastEntry)
  }
  if (REMOTE_ENABLED && score > 0) {
    void submitScore(name || 'Anonymous', score, maxTier, country || undefined)
  }
}

/** 更新續玩按鈕的雙行文字（預設／載入中／無廣告可重試） */
function setReviveLabel(state: 'default' | 'loading' | 'retry') {
  const main = reviveBtn.querySelector<HTMLSpanElement>('.revive-main')
  const sub = reviveBtn.querySelector<HTMLSpanElement>('.revive-sub')
  if (!main || !sub) return
  const label = {
    default: [STR.reviveMain, STR.reviveSub],
    loading: [STR.reviveLoading, STR.reviveLoadingSub],
    retry: [STR.reviveRetry, STR.reviveRetrySub],
  }[state]
  main.textContent = label[0]
  sub.textContent = label[1]
}

reviveBtn.addEventListener('click', async () => {
  reviveBtn.disabled = true
  setReviveLabel('loading') // 廣告載入時給明確回饋，慢速連線才不會像壞掉
  const watched = await ads.showRewarded('revive')
  reviveBtn.disabled = false
  if (!watched) {
    // 沒看完／無廣告可播：提示可重試，稍後還原成預設文字
    setReviveLabel('retry')
    window.setTimeout(() => setReviveLabel('default'), 2400)
    return
  }
  if (!game.revive()) {
    setReviveLabel('default')
    return
  }
  // 這局還沒結束：撤回剛記錄的排行榜成績與場數、作廢待送成績，等真正結束再記
  if (lastEntry) {
    removeScore(lastEntry)
    lastEntry = null
  }
  undoGameCount() // 復活續玩 → 撤回 onGameOver 時 +1 的場數，避免一局算兩場
  pendingSubmit = null
  lastResult = null
  setModal(null) // 保險：確保沒有殘留的暫停狀態
  overlayEl.classList.add('hidden')
  setReviveLabel('default') // 還原，下局結算才顯示正確文字
  // 卡片已關、玩家視線回到棋盤：用 toast 說明「頂端已清空」發生了什麼
  toastQueue.push(`<span class="ti">✨</span>${STR.reviveDone}`)
  pumpToasts()
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
refillFreeHammers() // 開遊戲即補到免費樓地板
refreshHammerCount()

function exitSmashMode() {
  smashMode = false
  hammerBtn.classList.remove('armed')
  hintEl.classList.add('hidden')
  // hidden 只有 opacity:0：一併拿掉 clickable，避免看不見的提示框擋住點擊
  hintEl.classList.remove('clickable')
}

/* ── 錘子提示：第一次顯示完整說明，之後只給迷你圖示、需要時點擊展開 ── */
const HAMMER_HINT_KEY = 'cosmic-merge:hammer-hint-seen'

function hammerHintSeen(): boolean {
  try {
    return !!localStorage.getItem(HAMMER_HINT_KEY)
  } catch {
    return false
  }
}

function showHammerHint() {
  hintEl.classList.remove('hidden')
  if (hammerHintSeen()) {
    hintTextEl.textContent = STR.hammerHintMini
    hintEl.classList.add('mini', 'clickable')
    return
  }
  hintTextEl.textContent = STR.hammerHint
  hintEl.classList.remove('mini', 'clickable')
  try {
    localStorage.setItem(HAMMER_HINT_KEY, '1')
  } catch {
    /* 私密模式忽略 */
  }
}

// 迷你提示點一下展開完整說明（僅本次進入敲擊模式生效）
hintEl.addEventListener('click', () => {
  if (!hintEl.classList.contains('mini')) return
  hintTextEl.textContent = STR.hammerHint
  hintEl.classList.remove('mini', 'clickable')
})

function enterSmashMode() {
  smashMode = true
  hammerBtn.classList.add('armed')
  showHammerHint()
}

hammerBtn.addEventListener('click', async () => {
  hammerBtn.blur()
  if (smashMode) {
    exitSmashMode()
    return
  }
  if (getHammers() > 0) {
    enterSmashMode()
    return
  }
  // 沒庫存：兌現一支（v1 直接給；接真實廣告後＝看完才給），並直接進入敲擊模式
  hammerBtn.disabled = true
  const watched = await ads.showRewarded('hammer')
  hammerBtn.disabled = false
  if (watched) {
    addHammer()
    refreshHammerCount()
    enterSmashMode()
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

/* ── 明確「送出到排行榜」按鈕 ── */
const submitBtn = $<HTMLButtonElement>('submit-score')
submitBtn.addEventListener('click', () => {
  flushPendingScore() // 用此刻填好的名字送出（idempotent：Play Again 再按不會重送）
  submitBtn.disabled = true
  submitBtn.textContent = STR.submitScoreDone
  // 送出後回抓真榜；自己那列由 ownPendingEntry（綁 lastResult）撐著不會閃掉
  if (REMOTE_ENABLED) void renderGlobalLeaderboard()
})

$<HTMLButtonElement>('restart').addEventListener('click', () => {
  flushPendingScore() // 用此刻填好的名字送出本局成績（若已按過送出鈕則不會重送）
  setModal(null) // 保險：清掉任何殘留的暫停狀態，避免新局開局即凍結
  overlayEl.classList.add('hidden')
  lastResult = null
  lastEntry = null
  exitSmashMode()
  refillFreeHammers() // 每局開局補到免費樓地板
  refreshHammerCount()
  game.restart()
})

// 關閉/切走分頁前盡力把還沒送出的成績寫出去（fetch 用 keepalive）
window.addEventListener('pagehide', flushPendingScore)

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
  tabEvolutionBtn.textContent = STR.evolution
  tabStarsBtn.textContent = STR.starsTab
  shareBtn.textContent = STR.share
  $<HTMLButtonElement>('restart').textContent = STR.restart
  muteBtn.setAttribute('aria-label', STR.mute)
  setReviveLabel('default')
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
    }
    // 敲中或敲空都退出敲擊模式：以前敲空毫無反應也不退出，
    // 之後的每一次點擊都被吞掉（不投放、不取消），玩家像是卡死
    exitSmashMode()
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

/* ── 底部圖鑑：同一列在「行星進化」與「恆星發現」間切換（不多佔畫面空間） ── */
const tabEvolutionBtn = $<HTMLButtonElement>('tab-evolution')
const tabStarsBtn = $<HTMLButtonElement>('tab-stars')
let chartMode: 'evolution' | 'stars' = 'evolution'
let chartRevertTimer = 0

function renderChart() {
  const chart = $<HTMLCanvasElement>('chart')
  const g = chart.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, chart.width, chart.height)
  g.textAlign = 'center'
  if (chartMode === 'evolution') {
    // 行星進化鏈：隕石 → 太陽（固定 11 顆）
    const planets = TIERS.slice(0, SUN_TIER + 1)
    const w = chart.width / planets.length
    planets.forEach((def, i) => {
      const scale = Math.min(1, (10 + i * 1.6) / def.radius)
      drawPlanet(g, def, w * i + w / 2, 30, 0, scale)
      g.fillStyle = '#6B5844'
      g.font = "bold 10px system-ui, sans-serif"
      g.fillText(planetName(i), w * i + w / 2, 64)
    })
    return
  }
  // 恆星發現鏈：太陽 + 系外恆星；未發現的是黑影＋?（吊玩家胃口）
  const cells = TIERS.length - SUN_TIER
  const w = chart.width / cells
  const top = SUN_TIER + discoveredCount()
  for (let t = SUN_TIER; t < TIERS.length; t++) {
    const def = TIERS[t]
    const cx = w * (t - SUN_TIER) + w / 2
    if (t <= top) {
      drawPlanet(g, def, cx, 28, 0, Math.min(1, 20 / def.radius))
      g.fillStyle = '#6B5844'
      g.font = 'bold 10px system-ui, sans-serif'
      g.fillText(planetName(t), cx, 64)
    } else {
      g.fillStyle = 'rgba(59, 48, 36, 0.35)'
      g.beginPath()
      g.arc(cx, 28, 18, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(244, 233, 215, 0.85)'
      g.font = 'bold 18px system-ui, sans-serif'
      g.fillText('?', cx, 34)
      g.fillStyle = '#6B5844'
      g.font = 'bold 10px system-ui, sans-serif'
      g.fillText('???', cx, 64)
    }
  }
}

function setChartMode(mode: 'evolution' | 'stars', autoRevert = false) {
  chartMode = mode
  clearTimeout(chartRevertTimer)
  tabEvolutionBtn.classList.toggle('active', mode === 'evolution')
  tabStarsBtn.classList.toggle('active', mode === 'stars')
  renderChart()
  // 發現新恆星時自動切到 STARS 展示幾秒，再切回進化鏈
  if (autoRevert) chartRevertTimer = window.setTimeout(() => setChartMode('evolution'), 5000)
}

tabEvolutionBtn.addEventListener('click', () => setChartMode('evolution'))
tabStarsBtn.addEventListener('click', () => setChartMode('stars'))

applyStrings()

/* ── BGM：第一次互動後啟動（autoplay 政策） ── */
window.addEventListener('pointerdown', () => startMusic(), { once: true })
window.addEventListener('keydown', () => startMusic(), { once: true })

/* ── 廣告 SDK 預熱：原生 App 開場就先跳追蹤授權＋初始化，玩家第一次點復活/榔頭才不用等 ── */
void ads.warmup?.()

/* ── PWA 離線（只在正式版 Web 註冊；Capacitor 原生 App 資產為本地、不需 SW 且避免快取怪異） ── */
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
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
  if (entries === null) {
    // 遠端連不上／逾時：退回本地榜，別讓玩家對著空白或轉圈的畫面卡住
    lbTitleEl.textContent = STR.offlineLeaderboard
    fillBoard(lbListEl, loadLeaderboard().slice(0, 10))
    return
  }
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
  if (!overlayEl.classList.contains('hidden')) return // 結算畫面已有榜，避免疊在上面造成卡住
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
    ['Supernovas', fmt(s.supernovas)],
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
  if (!overlayEl.classList.contains('hidden')) return // 同上：結算畫面開著時不疊 modal
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
  achvToastEl.innerHTML = text // 含手繪 SVG 圖示
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
    toastQueue.push(`<span class="ti">${a.icon}</span>${a.name} unlocked!`)
  }
  pumpToasts()
}

/** 玩家首次合成出太陽時，揭示「兩顆太陽→黑洞→發現新恆星」的核心目標（每台裝置一次） */
const GOAL_BH_KEY = 'cosmic-merge:goal-blackhole-seen'
function maybeShowBlackHoleGoal() {
  if (discoveredCount() > 0) return // 已經發現過恆星＝早就懂了，不用提示
  try {
    if (localStorage.getItem(GOAL_BH_KEY)) return
    localStorage.setItem(GOAL_BH_KEY, '1')
  } catch {
    /* 私密模式：至少提示一次，忽略寫入失敗 */
  }
  toastQueue.push(`<span class="ti">🕳️</span>${STR.goalBlackHole}`)
  pumpToasts()
}

/* ── 開發模式：掛上 window 方便在 console 觸發黑洞等事件（正式包不含） ── */
if (import.meta.env.DEV) (window as unknown as { game?: Game }).game = game

/* ── 主迴圈 ── */
let last = performance.now()
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1) // 切到背景分頁回來時避免大步進
  last = now
  if (!paused) game.update(dt)
  // 瀕死時輕輕脈動錘子鈕：在最緊張的當口提示「可敲掉一顆解圍」（沒庫存則兌現一支）
  hammerBtn.classList.toggle('nudge', game.state === 'playing' && game.inDanger && !smashMode)
  ctx!.clearRect(0, 0, BOARD.width, BOARD.height)
  game.draw(ctx!)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
