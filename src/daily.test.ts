import { beforeEach, describe, expect, it } from 'vitest'
import { claimDaily, dailyAvailable, peekDaily, resetDaily, rewardFor } from './daily'

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

describe('每日連續登入 streak', () => {
  beforeEach(() => {
    mockLocalStorage()
    resetDaily()
  })

  it('第一次領取＝連續第 1 天、基礎 +2 錘子', () => {
    expect(dailyAvailable('2026-08-01')).toBe(true)
    const r = claimDaily('2026-08-01')
    expect(r).toEqual({ streak: 1, hammers: 2, milestone: false })
    expect(dailyAvailable('2026-08-01')).toBe(false) // 同一天不能再領
  })

  it('同一天重複領取回傳 null', () => {
    claimDaily('2026-08-01')
    expect(claimDaily('2026-08-01')).toBeNull()
  })

  it('連續隔天領取會累加 streak', () => {
    expect(claimDaily('2026-08-01')?.streak).toBe(1)
    expect(claimDaily('2026-08-02')?.streak).toBe(2)
    expect(claimDaily('2026-08-03')?.streak).toBe(3)
  })

  it('中斷一天以上就重置回 1', () => {
    claimDaily('2026-08-01')
    claimDaily('2026-08-02')
    expect(claimDaily('2026-08-05')?.streak).toBe(1) // 跳過 3、4 → 斷
  })

  it('里程碑加碼：第 3 天 +2、每 7 天 +5', () => {
    expect(rewardFor(1)).toEqual({ streak: 1, hammers: 2, milestone: false })
    expect(rewardFor(3)).toEqual({ streak: 3, hammers: 4, milestone: true })
    expect(rewardFor(7)).toEqual({ streak: 7, hammers: 7, milestone: true })
    expect(rewardFor(14)).toEqual({ streak: 14, hammers: 7, milestone: true })
    expect(rewardFor(8)).toEqual({ streak: 8, hammers: 2, milestone: false })
  })

  it('peekDaily 預覽不寫入（可重複呼叫、之後仍可領）', () => {
    expect(peekDaily('2026-08-01')?.streak).toBe(1)
    expect(peekDaily('2026-08-01')?.streak).toBe(1) // 沒有因為 peek 而前進
    expect(dailyAvailable('2026-08-01')).toBe(true) // 仍可領
    expect(claimDaily('2026-08-01')?.streak).toBe(1)
    expect(peekDaily('2026-08-01')).toBeNull() // 領完今天沒得預覽
  })
})
