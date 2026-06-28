import { beforeEach, describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, evaluateAchievements, loadUnlocked } from './achievements'
import type { Stats } from './stats'

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

const base: Stats = { games: 0, bestScore: 0, maxTier: 0, bestCombo: 0, totalMerges: 0, suns: 0 }

describe('achievements（成就）', () => {
  beforeEach(mockLocalStorage)

  it('每個成就的 id 唯一', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('階級門檻：到地球解鎖 Blue Marble，未到土星不解鎖 Ringbearer', () => {
    const ids = evaluateAchievements({ ...base, maxTier: 5 }).map(a => a.id)
    expect(ids).toContain('earth')
    expect(ids).not.toContain('saturn')
    expect(ids).not.toContain('sun')
  })

  it('已解鎖不會再回報（newly 去重 + 持久化）', () => {
    const first = evaluateAchievements({ ...base, maxTier: 10 }).map(a => a.id)
    expect(first).toEqual(expect.arrayContaining(['earth', 'saturn', 'sun']))
    const second = evaluateAchievements({ ...base, maxTier: 10 })
    expect(second).toEqual([])
    expect(loadUnlocked().has('sun')).toBe(true)
  })

  it('分數門檻：5000 分一次解鎖 Rookie + Pro，但非 Cosmic', () => {
    const ids = evaluateAchievements({ ...base, bestScore: 5000 }).map(a => a.id)
    expect(ids).toEqual(expect.arrayContaining(['score1k', 'score5k']))
    expect(ids).not.toContain('score10k')
  })

  it('連鎖門檻：×8 解鎖全部三個連鎖成就', () => {
    const ids = evaluateAchievements({ ...base, bestCombo: 8 }).map(a => a.id)
    expect(ids).toEqual(expect.arrayContaining(['combo3', 'combo5', 'combo8']))
  })

  it('場數與合成門檻', () => {
    expect(evaluateAchievements({ ...base, games: 10 }).map(a => a.id)).toContain('games10')
    expect(evaluateAchievements({ ...base, totalMerges: 100 }).map(a => a.id)).toContain('merges100')
  })

  it('全空白統計不解鎖任何成就', () => {
    expect(evaluateAchievements({ ...base })).toEqual([])
  })
})
