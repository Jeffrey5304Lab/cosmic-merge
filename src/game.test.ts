import { describe, expect, it } from 'vitest'
import { Game, type GameCallbacks } from './game'

/** 無頭模擬：固定步長推進物理 + 定時投放 */
function makeGame() {
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
  return { game: new Game(cb), events }
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

  it('換球 swapNext：current 與 next 互換', () => {
    let lastNext = -1
    const cb: GameCallbacks = {
      onScore() {},
      onNext(tier) {
        lastNext = tier
      },
      onCombo() {},
      onGameOver() {},
    }
    const game = new Game(cb)
    const nextBefore = lastNext
    game.swapNext()
    // 互換後 onNext 回報的應該是原本的 current（可能與 next 相同階級，至少 callback 有觸發）
    expect(lastNext).toBeGreaterThanOrEqual(0)
    game.swapNext()
    expect(lastNext).toBe(nextBefore) // 換兩次回到原狀
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
