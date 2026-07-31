/**
 * 無頭多策略試玩壓力測試（fuzz）：用不同投放策略跑很多場真實遊戲，
 * 每一步檢查不變量，抓出物理爆掉／狀態卡死／分數異常／黑洞卡住等 bug。
 *
 * 不是驗「好不好玩」（那是主觀），是驗「跑很多場都不會壞」。
 */
import { describe, expect, it } from 'vitest'
import { Game, type GameCallbacks } from './game'
import { mulberry32 } from './logic'
import { BOARD, MAX_TIER, SUN_TIER, TIERS } from './planets'
import { resetDiscovery } from './discovery'

const STEP = 1 / 60

type Strategy = (game: Game, rng: () => number, tick: number) => void

/** 各種投放策略：決定每次投放前把準星 aim 到哪 */
const STRATEGIES: Record<string, Strategy> = {
  // 一律置中（最天真）
  center: (g) => g.aim(BOARD.width / 2),
  // 完全隨機落點
  random: (g, rng) => g.aim(rng() * BOARD.width),
  // 固定三欄輪流
  threeCol: (g, _rng, tick) => g.aim([BOARD.width * 0.25, BOARD.width * 0.5, BOARD.width * 0.75][tick % 3]),
  // 兩側牆邊交替（壓力測試邊緣/夾牆）
  edges: (g, _rng, tick) => g.aim(tick % 2 === 0 ? 0 : BOARD.width),
  // 貪婪：若場上有同階星球，瞄它上方促成合成；否則置中
  greedy: (g) => {
    const want = g.currentDropTier
    let best: { x: number; y: number } | null = null
    for (const p of g.debugPlanets) {
      if (p.tier === want && (!best || p.y < best.y)) best = { x: p.x, y: p.y }
    }
    g.aim(best ? best.x : BOARD.width / 2)
  },
}

interface Anomaly {
  kind: string
  detail: string
}

/** 每步檢查不變量，發現異常推進 out（只記首次，避免洗版） */
function checkInvariants(game: Game, ctx: string, seen: Set<string>, out: Anomaly[]) {
  const push = (kind: string, detail: string) => {
    const key = `${ctx}:${kind}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ kind, detail: `${ctx} — ${detail}` })
  }

  if (!Number.isFinite(game.score)) push('score-nan', `score=${game.score}`)
  const spd = game.maxBodySpeed
  if (!Number.isFinite(spd)) push('speed-nan', `maxBodySpeed=${spd}`)
  else if (spd > 150) push('speed-blowup', `maxBodySpeed=${spd.toFixed(1)}`)
  if (game.bodyCount > 600) push('runaway-bodies', `bodyCount=${game.bodyCount}`)

  for (const p of game.debugPlanets) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      push('pos-nan', `tier${p.tier} at (${p.x},${p.y})`)
      break
    }
    // 允許牆邊少量重疊，但不該整顆跑出場外很遠（穿牆/隧穿）
    if (p.x < -60 || p.x > BOARD.width + 60 || p.y < -200 || p.y > BOARD.height + 120) {
      push('out-of-bounds', `tier${p.tier} at (${p.x.toFixed(0)},${p.y.toFixed(0)})`)
      break
    }
  }
}

/** 跑一場：回傳統計；把任何異常推進 anomalies */
function playOne(strategyName: string, seed: number, anomalies: Anomaly[]) {
  resetDiscovery(0) // 每場從零開始，結果可比較
  const rng = mulberry32(seed)
  let gameOverCount = 0
  const cb: GameCallbacks = {
    onScore() {},
    onNext() {},
    onCombo() {},
    onMerge() {},
    onSupernova() {},
    onDiscover() {},
    onGameOver() {
      gameOverCount++
    },
  }
  const strat = STRATEGIES[strategyName]
  const seen = new Set<string>()
  const ctx = `${strategyName}#${seed}`
  const game = new Game(cb, rng)

  let prevScore = 0
  let peakBodies = 0
  let sinceDrop = 0
  let tick = 0
  const maxT = 60 // 秒

  try {
    for (let t = 0; t < maxT && game.state !== 'over'; t += STEP) {
      sinceDrop += STEP
      if (sinceDrop >= 0.5) {
        sinceDrop = 0
        strat(game, rng, tick++)
        game.drop()
      }
      game.update(STEP)

      if (game.score < prevScore) {
        anomalies.push({ kind: 'score-decrease', detail: `${ctx} — ${prevScore} → ${game.score}` })
      }
      prevScore = game.score
      peakBodies = Math.max(peakBodies, game.bodyCount)
      checkInvariants(game, ctx, seen, anomalies)
    }

    // 結束後：再丟/敲不應改變分數或炸錯
    if (game.state === 'over') {
      const scoreAtEnd = game.score
      for (let i = 0; i < 60; i++) {
        game.drop()
        game.smash(rng() * BOARD.width, rng() * BOARD.height)
        game.update(STEP)
      }
      if (game.score !== scoreAtEnd) {
        anomalies.push({ kind: 'post-over-score-change', detail: `${ctx} — ${scoreAtEnd} → ${game.score}` })
      }
      if (gameOverCount !== 1) {
        anomalies.push({ kind: 'gameover-count', detail: `${ctx} — onGameOver fired ${gameOverCount}×` })
      }
    }
  } catch (e) {
    anomalies.push({ kind: 'exception', detail: `${ctx} — ${(e as Error).message}` })
  }

  return { score: game.score, maxTier: game.maxTierReached, peakBodies, reachedOver: game.state === 'over' }
}

describe('多策略試玩壓力測試（fuzz）', () => {
  // 提交進 CI 的是精簡版（每策略 5 場）以保時間；探索式的 200 場 sweep 已離線跑過、零異常。
  it('各策略跑很多場都不會壞（不變量全程成立）', { timeout: 30000 }, () => {
    const anomalies: Anomaly[] = []
    const perStrategy = 5 // 5 策略 × 5 = 25 場
    const summary: string[] = []

    for (const name of Object.keys(STRATEGIES)) {
      let scoreSum = 0
      let overCount = 0
      let maxTierSeen = 0
      let peak = 0
      for (let i = 0; i < perStrategy; i++) {
        const r = playOne(name, 1000 + i * 7, anomalies)
        scoreSum += r.score
        if (r.reachedOver) overCount++
        maxTierSeen = Math.max(maxTierSeen, r.maxTier)
        peak = Math.max(peak, r.peakBodies)
      }
      summary.push(
        `  ${name.padEnd(9)} avg=${Math.round(scoreSum / perStrategy)
          .toString()
          .padStart(6)} · over ${overCount}/${perStrategy} · topTier=${maxTierSeen} (${TIERS[maxTierSeen].name}) · peakBodies=${peak}`,
      )
    }

    // eslint-disable-next-line no-console
    console.log('\n[playtest] 策略統計:\n' + summary.join('\n'))
    if (anomalies.length) {
      // eslint-disable-next-line no-console
      console.log('\n[playtest] 異常:\n' + anomalies.map((a) => `  • ${a.kind}: ${a.detail}`).join('\n'))
    }
    resetDiscovery(0)
    expect(anomalies).toEqual([])
  })

  it('連續猛丟（不理冷卻、每幀都丟）不會爆場或崩潰', () => {
    resetDiscovery(0)
    const game = new Game({ onScore() {}, onNext() {}, onCombo() {}, onGameOver() {} }, mulberry32(7))
    let peak = 0
    for (let i = 0; i < 60 * 30 && game.state !== 'over'; i++) {
      game.aim((i * 37) % BOARD.width) // 掃過整排
      game.drop() // 冷卻會擋掉大多數：驗證 gating 正確
      game.update(STEP)
      peak = Math.max(peak, game.bodyCount)
      expect(Number.isFinite(game.maxBodySpeed)).toBe(true)
    }
    expect(peak).toBeLessThan(600) // 冷卻若失效會瞬間爆場
    resetDiscovery(0)
  })

  it('混合輸入（邊丟邊隨機敲榔頭）＋長時間閒置都不會壞', () => {
    resetDiscovery(0)
    for (let seed = 0; seed < 4; seed++) {
      const rng = mulberry32(seed * 11 + 5)
      const game = new Game({ onScore() {}, onNext() {}, onCombo() {}, onMerge() {}, onSupernova() {}, onDiscover() {}, onGameOver() {} }, rng)
      let sinceDrop = 0
      // 邊丟邊敲：驗證 smash 與合成/結束判定交錯時不衝突
      for (let t = 0; t < 40 && game.state !== 'over'; t += STEP) {
        sinceDrop += STEP
        if (sinceDrop >= 0.5) {
          sinceDrop = 0
          game.aim(rng() * BOARD.width)
          game.drop()
        }
        if (rng() < 0.02) game.smash(rng() * BOARD.width, rng() * BOARD.height)
        game.update(STEP)
        expect(Number.isFinite(game.score)).toBe(true)
        for (const p of game.debugPlanets) {
          expect(p.x).toBeGreaterThan(-60)
          expect(p.x).toBeLessThan(BOARD.width + 60)
        }
      }
      // 長時間閒置：不投放只推進，跑滿哈欠/焦躁情緒排程（曾經沒被任何測試踩過）
      for (let i = 0; i < 60 * 30; i++) game.update(STEP)
      expect(Number.isFinite(game.score)).toBe(true)
      expect(game.state).not.toBe('over') // 沒丟新星球不該無故結束
    }
    resetDiscovery(0)
  })

  it('黑洞在各種發現進度＋隨機雜物下一定會結束（不卡住）', () => {
    for (const discovered of [0, 1, 4, 8, MAX_TIER - SUN_TIER]) {
      for (let seed = 0; seed < 4; seed++) {
        resetDiscovery(discovered)
        const rng = mulberry32(seed * 13 + 1)
        const topTier = Math.min(SUN_TIER + discovered, MAX_TIER)
        const game = new Game({ onScore() {}, onNext() {}, onCombo() {}, onSupernova() {}, onDiscover() {}, onGameOver() {} }, rng)
        const r = TIERS[topTier].radius
        const y = BOARD.height - r - 4
        // 兩顆頂階恆星交疊 → 觸發塌陷
        game.debugSpawn(topTier, BOARD.width / 2 - r / 4, y)
        game.debugSpawn(topTier, BOARD.width / 2 + r / 4, y)
        // 灑一些隨機雜物
        for (let k = 0; k < 5; k++) {
          game.debugSpawn(Math.floor(rng() * 5), 40 + rng() * (BOARD.width - 80), 40 + rng() * 120)
        }
        // 跑到過場（2.7s）之後；過場期間亂敲榔頭，驗證 smash 被鎖住（回傳 false、不移除星球）
        for (let i = 0; i < 60 * 4; i++) {
          if (game.inBlackHole) expect(game.smash(rng() * BOARD.width, rng() * BOARD.height)).toBe(false)
          game.update(STEP)
        }
        // 黑洞必須已結束：場面收斂、可繼續玩
        expect(game.bodyCount).toBeLessThan(6)
        game.aim(BOARD.width / 2)
        game.drop()
        for (let i = 0; i < 60; i++) game.update(STEP)
        expect(Number.isFinite(game.score)).toBe(true)
        expect(game.state).not.toBe('over')
      }
    }
    resetDiscovery(0)
  })

  it('復活壓力：死→復活→續玩→再死，行為一致且不崩', { timeout: 30000 }, () => {
    resetDiscovery(0)
    for (let seed = 0; seed < 3; seed++) {
      let overs = 0
      const game = new Game(
        { onScore() {}, onNext() {}, onCombo() {}, onGameOver() {
          overs++
        } },
        mulberry32(seed * 5 + 3),
      )
      const rng = mulberry32(seed * 5 + 99)
      // 用隨機落點快速堆滿（置中連丟會高效合成、反而不容易死，不利於測「死亡」）
      const fillToOver = () => {
        let sinceDrop = 0
        for (let t = 0; t < 200 && game.state !== 'over'; t += STEP) {
          sinceDrop += STEP
          if (sinceDrop >= 0.4) {
            sinceDrop = 0
            game.aim(rng() * BOARD.width)
            game.drop()
          }
          game.update(STEP)
        }
      }
      // 一局最多 3 次：前 3 次都能復活，第 4 次不行
      for (let n = 1; n <= 3; n++) {
        fillToOver()
        expect(game.state).toBe('over')
        const before = game.bodyCount
        expect(game.revive()).toBe(true)
        expect(game.state).toBe('playing')
        expect(game.bodyCount).toBeLessThanOrEqual(before)
      }
      fillToOver()
      expect(game.state).toBe('over')
      expect(game.revive()).toBe(false) // 超過上限
      expect(overs).toBe(4)
    }
    resetDiscovery(0)
  })
})
