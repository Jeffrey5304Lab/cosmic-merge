import { beforeEach, describe, expect, it } from 'vitest'
import {
  LADDER,
  allComplete,
  completedCount,
  currentConstellation,
  litCount,
  litMask,
  registerMerge,
  resetConstellations,
  resetRunProgress,
} from './constellations'

/** 測試環境（node）沒有 localStorage，用 Map 模擬 */
function mockLocalStorage() {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

/** 依 req 逐一合成，把目前目標星座整座點亮；回傳最後一次 registerMerge 結果 */
function completeCurrent() {
  const c = currentConstellation()
  let last = registerMerge(-999) // 無效階級，占位
  for (const tier of c.req) last = registerMerge(tier)
  return last
}

describe('星座任務資料完整性', () => {
  it('每座星座的 req 長度都等於 star 數，連線索引都在範圍內，req 都在 1..10', () => {
    for (const c of LADDER) {
      expect(c.req.length).toBe(c.stars.length)
      for (const [a, b] of c.lines) {
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThan(c.stars.length)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(c.stars.length)
      }
      for (const r of c.req) {
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(10)
      }
      for (const [x, y] of c.stars) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(1)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('bonus 隨階梯遞增', () => {
    for (let i = 1; i < LADDER.length; i++) {
      expect(LADDER[i].bonus).toBeGreaterThan(LADDER[i - 1].bonus)
    }
  })
})

describe('星座任務進度', () => {
  beforeEach(() => {
    mockLocalStorage()
    resetConstellations(0)
  })

  it('一開始目標是第一座、沒有任何星點亮', () => {
    expect(completedCount()).toBe(0)
    expect(currentConstellation().id).toBe(LADDER[0].id)
    expect(litCount()).toBe(0)
    expect(litMask()).toEqual([false, false, false])
  })

  it('合成出需求階級會點亮對應的星（且只點最靠前那顆）', () => {
    const c = currentConstellation() // Triangulum req [3,4,5]
    const r = registerMerge(c.req[0])
    expect(r.litIndex).toBe(0)
    expect(r.completed).toBe(false)
    expect(litCount()).toBe(1)
  })

  it('合成到不需要的階級不會點亮任何星', () => {
    const r = registerMerge(9) // Triangulum 不需要木星
    expect(r.litIndex).toBe(-1)
    expect(litCount()).toBe(0)
  })

  it('點滿整座 → 完成、給 bonus、推進到下一座並重置點亮', () => {
    const first = LADDER[0]
    const r = completeCurrent()
    expect(r.completed).toBe(true)
    expect(r.name).toBe(first.name)
    expect(r.bonus).toBe(first.bonus)
    expect(completedCount()).toBe(1)
    expect(currentConstellation().id).toBe(LADDER[1].id)
    expect(litCount()).toBe(0) // 新目標從零開始
  })

  it('重複需求階級要各自點亮不同的星（大熊座的兩顆土星）', () => {
    resetConstellations(LADDER.length - 1) // Ursa Major，req 含兩個 8、兩個 9
    const ursa = currentConstellation()
    expect(ursa.id).toBe('ursa-major')
    // 造出第一顆土星(8)點亮第一個需求 8 的星
    const first8 = registerMerge(8)
    expect(first8.litIndex).toBeGreaterThanOrEqual(0)
    const idx1 = first8.litIndex
    // 第二顆土星(8)點亮「下一個」需求 8 的星（不同索引）
    const second8 = registerMerge(8)
    expect(second8.litIndex).toBeGreaterThan(idx1)
    // 第三顆土星沒有更多需求 8 的星可點
    expect(registerMerge(8).litIndex).toBe(-1)
  })

  it('全部星座完成後 allComplete 為真、registerMerge 不再點亮', () => {
    resetConstellations(LADDER.length)
    expect(allComplete()).toBe(true)
    expect(litMask().every(Boolean)).toBe(true) // 圖鑑顯示滿星
    expect(registerMerge(5).litIndex).toBe(-1)
    expect(completedCount()).toBe(LADDER.length)
  })

  it('resetRunProgress 清掉本局點亮但保留已解鎖階梯', () => {
    registerMerge(currentConstellation().req[0])
    expect(litCount()).toBe(1)
    resetRunProgress()
    expect(litCount()).toBe(0)
    expect(completedCount()).toBe(0) // 階梯不變
  })

  it('完成星座會把解鎖進度寫進 localStorage（跨局保存）', () => {
    completeCurrent() // 完成第一座
    expect(completedCount()).toBe(1)
    expect(localStorage.getItem('cosmic-merge:constellations-done')).toBe('1')
  })
})
