import { describe, expect, it } from 'vitest'
import { Game, type GameCallbacks } from './game'
import { mulberry32, SUPERNOVA_SCORE } from './logic'
import { BOARD, MAX_TIER, SUN_TIER, TIERS } from './planets'
import { resetDiscovery } from './discovery'

/** 無頭模擬：固定步長推進物理 + 定時投放 */
function makeGame(rng?: () => number) {
  const events = {
    gameOver: 0,
    lastScore: 0,
    merges: 0,
  }
  const cb: GameCallbacks = {
    onScore(score) {
      events.lastScore = score
    },
    onNext() {},
    onCombo() {
      events.merges++
    },
    onGameOver() {
      events.gameOver++
    },
  }
  return { game: new Game(cb, rng), events }
}

function simulate(game: Game, seconds: number, dropEvery = 0) {
  const step = 1 / 60
  let sinceDrop = 0
  for (let t = 0; t < seconds; t += step) {
    if (dropEvery > 0) {
      sinceDrop += step
      if (sinceDrop >= dropEvery) {
        sinceDrop = 0
        game.drop()
      }
    }
    game.update(step)
  }
}

describe('Game 整合（無頭物理模擬）', () => {
  it('投放會觸發合成並得分', () => {
    const { game, events } = makeGame()
    // 中央連續投放 20 顆，小星球必然出現同階合成
    simulate(game, 12, 0.5)
    expect(events.lastScore).toBeGreaterThan(0)
    expect(events.merges).toBeGreaterThan(0)
  })

  it('持續塞滿場地會觸發遊戲結束，且只觸發一次', () => {
    const { game, events } = makeGame()
    // 最多模擬 150 秒、每 0.5 秒丟一顆（約 300 顆），中途結束就停
    const step = 1 / 60
    let sinceDrop = 0
    for (let t = 0; t < 150 && game.state !== 'over'; t += step) {
      sinceDrop += step
      if (sinceDrop >= 0.5) {
        sinceDrop = 0
        game.drop()
      }
      game.update(step)
    }
    expect(game.state).toBe('over')
    expect(events.gameOver).toBe(1)
    // 結束後再丟沒有作用
    const scoreAtEnd = game.score
    simulate(game, 2, 0.5)
    expect(game.score).toBe(scoreAtEnd)
  })

  it('復活：清掉上方星球、繼續本局、每局限一次', () => {
    const { game, events } = makeGame()
    const step = 1 / 60
    let sinceDrop = 0
    for (let t = 0; t < 150 && game.state !== 'over'; t += step) {
      sinceDrop += step
      if (sinceDrop >= 0.5) {
        sinceDrop = 0
        game.drop()
      }
      game.update(step)
    }
    expect(game.state).toBe('over')
    const bodiesBefore = game.bodyCount
    const scoreBefore = game.score

    expect(game.revive()).toBe(true)
    expect(game.state).toBe('playing')
    expect(game.bodyCount).toBeLessThan(bodiesBefore)
    expect(game.score).toBe(scoreBefore) // 分數保留

    // 還能繼續玩
    simulate(game, 5, 0.5)
    expect(game.score).toBeGreaterThanOrEqual(scoreBefore)

    // 再死一次不能再復活
    for (let t = 0; t < 150 && game.state !== 'over'; t += step) {
      sinceDrop += step
      if (sinceDrop >= 0.5) {
        sinceDrop = 0
        game.drop()
      }
      game.update(step)
    }
    expect(game.state).toBe('over')
    expect(game.revive()).toBe(false)
    expect(events.gameOver).toBe(2)
  })

  it('超新星：兩顆太陽相撞湮滅、得大分、觸發 onSupernova/onDiscover 並誕生新恆星', () => {
    resetDiscovery(0)
    let supernovas = 0
    let merges = 0
    let discovered: number | null = null
    let lastScore = 0
    const cb: GameCallbacks = {
      onScore(score) {
        lastScore = score
      },
      onNext() {},
      onCombo() {},
      onMerge() {
        merges++
      },
      onSupernova() {
        supernovas++
      },
      onDiscover(tier) {
        discovered = tier
      },
      onGameOver() {},
    }
    const game = new Game(cb)
    // 刻意讓兩顆太陽中心距離小於半徑和，確保一定交疊碰撞（不依賴板寬/半徑的絕對數值）
    const r = TIERS[SUN_TIER].radius
    const y = BOARD.height - r - 4
    game.debugSpawn(SUN_TIER, BOARD.width / 2 - r / 4, y)
    game.debugSpawn(SUN_TIER, BOARD.width / 2 + r / 4, y)
    expect(game.bodyCount).toBe(2)
    simulate(game, 3.5) // 黑洞過場總長 2.7 秒（BH_PHASE.total），跑到結算之後
    expect(game.bodyCount).toBe(1) // 兩顆太陽湮滅，黑洞原地誕生新發現的恆星
    expect(discovered).toBe(SUN_TIER + 1) // 第一顆系外恆星：Proxima
    expect(supernovas).toBe(1)
    expect(merges).toBe(0) // 超新星不算合成（避免恆星數重複計）
    expect(lastScore).toBeGreaterThanOrEqual(SUPERNOVA_SCORE)
    expect(game.score).toBe(lastScore)
    // 之後照常能玩，物理沒有壞掉
    simulate(game, 4, 0.5)
    expect(game.state).not.toBe('over')
    resetDiscovery(0)
  })

  it('黑洞：兩顆太陽相撞後吞掉場上其他星球，加分算進被吞的星球', () => {
    resetDiscovery(0)
    let supernovas = 0
    let lastScore = 0
    const cb: GameCallbacks = {
      onScore(score) {
        lastScore = score
      },
      onNext() {},
      onCombo() {},
      onSupernova() {
        supernovas++
      },
      onGameOver() {},
    }
    const game = new Game(cb)
    const r = TIERS[SUN_TIER].radius
    const y = BOARD.height - r - 4
    game.debugSpawn(SUN_TIER, BOARD.width / 2 - r / 4, y)
    game.debugSpawn(SUN_TIER, BOARD.width / 2 + r / 4, y)
    // 場上另外擺幾顆無關的小星球，應該一起被黑洞吞掉、分數跟著吞噬量走
    game.debugSpawn(2, 40, 40)
    game.debugSpawn(3, BOARD.width - 40, 40)
    expect(game.bodyCount).toBe(4)
    simulate(game, 3.5)
    expect(game.bodyCount).toBe(1) // 全場清空（只剩黑洞後誕生的新恆星）
    expect(supernovas).toBe(1)
    // 66（太陽合成分）+ 3（tier2）+ 6（tier3）＝至少 75 才對得起被吞掉的星球
    expect(lastScore).toBeGreaterThan(SUPERNOVA_SCORE)
    expect(game.state).not.toBe('over')
    resetDiscovery(0)
  })

  it('已發現恆星後：太陽相撞合成新恆星（一般合成），不再立刻變黑洞', () => {
    resetDiscovery(1) // 已發現 Proxima
    let supernovas = 0
    let mergedTier = -1
    const cb: GameCallbacks = {
      onScore() {},
      onNext() {},
      onCombo() {},
      onMerge(tier) {
        mergedTier = tier
      },
      onSupernova() {
        supernovas++
      },
      onGameOver() {},
    }
    const game = new Game(cb)
    const r = TIERS[SUN_TIER].radius
    const y = BOARD.height - r - 4
    game.debugSpawn(SUN_TIER, BOARD.width / 2 - r / 4, y)
    game.debugSpawn(SUN_TIER, BOARD.width / 2 + r / 4, y)
    simulate(game, 2)
    expect(game.bodyCount).toBe(1) // 合成出一顆 Proxima
    expect(mergedTier).toBe(SUN_TIER + 1)
    expect(supernovas).toBe(0) // 要 Proxima+Proxima 才會塌陷成黑洞
    resetDiscovery(0)
  })

  it('頂階恆星（全部發現完）相撞仍塌陷成黑洞，但不再發現新恆星', () => {
    resetDiscovery(MAX_TIER - SUN_TIER) // 全部發現完
    let supernovas = 0
    let discovers = 0
    const cb: GameCallbacks = {
      onScore() {},
      onNext() {},
      onCombo() {},
      onSupernova() {
        supernovas++
      },
      onDiscover() {
        discovers++
      },
      onGameOver() {},
    }
    const game = new Game(cb)
    const r = TIERS[MAX_TIER].radius
    const y = BOARD.height - r - 4
    game.debugSpawn(MAX_TIER, BOARD.width / 2 - r / 4, y)
    game.debugSpawn(MAX_TIER, BOARD.width / 2 + r / 4, y)
    simulate(game, 3.5)
    expect(game.bodyCount).toBe(0) // 沒有新恆星可發現：場上淨空
    expect(supernovas).toBe(1)
    expect(discovers).toBe(0)
    resetDiscovery(0)
  })

  it('小錘子 smash：敲掉一顆星球', () => {
    const { game } = makeGame()
    simulate(game, 6, 0.5)
    const before = game.bodyCount
    expect(before).toBeGreaterThan(0)
    // 沿中央往上掃，敲到第一顆為止
    let hit = false
    for (let y = 640; y > 100 && !hit; y -= 20) {
      hit = game.smash(230, y)
    }
    expect(hit).toBe(true)
    expect(game.bodyCount).toBe(before - 1)
  })

  it('小錘子 smash：敲空回傳 false、不影響場上星球（點遠處空地）', () => {
    const { game } = makeGame()
    simulate(game, 4, 0.5)
    const before = game.bodyCount
    // 頂端投放線附近沒有已落定星球（星球都堆在底部），遠超 24px 容忍
    expect(game.smash(10, 10)).toBe(false)
    expect(game.bodyCount).toBe(before)
  })

  it('幀率抖動不會把已落定的星球踢飛（固定步長積分）', () => {
    // 固定種子：避免隨機落點偶爾造成邊緣案例導致測試不穩定
    const { game } = makeGame(mulberry32(42))
    // 丟幾顆並讓它們落定
    simulate(game, 8, 0.5)
    for (let i = 0; i < 180; i++) game.update(1 / 60)
    const restSpeed = game.maxBodySpeed
    // 模擬點擊/重排造成的卡頓：dt 忽快忽慢
    let maxSeen = 0
    for (let i = 0; i < 120; i++) {
      const dt = i % 2 === 0 ? 1 / 60 : 1 / 18 // ~55ms 尖峰
      game.update(dt)
      maxSeen = Math.max(maxSeen, game.maxBodySpeed)
    }
    // 固定步長下，抖動不應讓速度暴衝
    expect(maxSeen).toBeLessThan(restSpeed + 2)
  })

  it('restart 重置分數與狀態，可以再玩', () => {
    const { game, events } = makeGame()
    simulate(game, 8, 0.5)
    expect(game.score).toBeGreaterThan(0)
    game.restart()
    expect(game.state).toBe('ready')
    expect(game.score).toBe(0)
    simulate(game, 8, 0.5)
    expect(events.lastScore).toBeGreaterThan(0)
  })
})
