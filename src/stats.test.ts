import { beforeEach, describe, expect, it } from 'vitest'
import { loadStats, recordCombo, recordGame, recordMerge, undoGameCount } from './stats'

/** 測試環境（node）沒有 localStorage，用 Map 模擬，讓持久化邏輯可被驗證 */
function mockLocalStorage() {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v))
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('stats（終身統計）', () => {
  beforeEach(mockLocalStorage)

  it('空白起始全為 0', () => {
    expect(loadStats()).toEqual({
      games: 0,
      bestScore: 0,
      maxTier: 0,
      bestCombo: 0,
      totalMerges: 0,
      suns: 0,
    })
  })

  it('recordMerge 累計合成數、取最高階級、太陽計數', () => {
    recordMerge(3)
    recordMerge(5)
    const s = recordMerge(10) // 太陽 = MAX_TIER
    expect(s.totalMerges).toBe(3)
    expect(s.maxTier).toBe(10)
    expect(s.suns).toBe(1)
  })

  it('recordGame 累計場數並保留最高分/最高階級', () => {
    recordGame(1000, 5)
    const s = recordGame(800, 7)
    expect(s.games).toBe(2)
    expect(s.bestScore).toBe(1000)
    expect(s.maxTier).toBe(7)
  })

  it('recordCombo 只留最佳倍率', () => {
    recordCombo(3)
    const s = recordCombo(2)
    expect(s.bestCombo).toBe(3)
  })

  it('undoGameCount 撤回一場、不會低於 0', () => {
    recordGame(100, 2)
    expect(undoGameCount().games).toBe(0)
    expect(undoGameCount().games).toBe(0)
  })

  it('壞資料不會炸（回退為空白）', () => {
    localStorage.setItem('cosmic-merge:stats', '{not json')
    expect(loadStats().games).toBe(0)
  })
})
