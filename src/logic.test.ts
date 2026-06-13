import { describe, expect, it } from 'vitest'
import { ComboTracker, dailySeed, hashString, mergeScore, mulberry32, nextTier, pickDropTier } from './logic'
import { BOARD, DROPPABLE_TIERS, MAX_TIER, TIERS } from './planets'

describe('TIERS 設定', () => {
  it('半徑嚴格遞增（大星球一定比小星球大）', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].radius).toBeGreaterThan(TIERS[i - 1].radius)
    }
  })

  it('tier 索引與陣列位置一致', () => {
    TIERS.forEach((t, i) => expect(t.tier).toBe(i))
  })

  it('每一階都有名稱', () => {
    for (const t of TIERS) {
      expect(t.name.length).toBeGreaterThan(0)
    }
  })

  it('最大星球（太陽）放得進場地', () => {
    expect(TIERS[MAX_TIER].radius * 2).toBeLessThan(BOARD.width)
  })

  it('可投放星球的頂部不會超過警戒線太多', () => {
    // 投放點在 dropY，最大可投放星球不應該一出生就壓線
    const maxDroppable = TIERS[DROPPABLE_TIERS - 1]
    expect(BOARD.dropY + maxDroppable.radius).toBeLessThan(BOARD.height)
  })
})

describe('mergeScore', () => {
  it('是三角數列：合出 tier 1 得 3 分、tier 10 得 66 分', () => {
    expect(mergeScore(1)).toBe(3)
    expect(mergeScore(2)).toBe(6)
    expect(mergeScore(10)).toBe(66)
  })

  it('階級越高分越多', () => {
    for (let t = 1; t <= MAX_TIER; t++) {
      expect(mergeScore(t)).toBeGreaterThan(mergeScore(t - 1))
    }
  })
})

describe('nextTier', () => {
  it('一般星球升一級', () => {
    expect(nextTier(0)).toBe(1)
    expect(nextTier(MAX_TIER - 1)).toBe(MAX_TIER)
  })

  it('太陽（最高階）不再合成', () => {
    expect(nextTier(MAX_TIER)).toBeNull()
  })
})

describe('pickDropTier', () => {
  it('只會抽出可投放範圍內的階級', () => {
    for (let i = 0; i < 500; i++) {
      const t = pickDropTier()
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(DROPPABLE_TIERS)
    }
  })

  it('rng=0 抽到最小、rng→1 抽到最大可投放', () => {
    expect(pickDropTier(() => 0)).toBe(0)
    expect(pickDropTier(() => 0.9999)).toBe(DROPPABLE_TIERS - 1)
  })

  it('小星球出現率高於大星球', () => {
    const counts = new Array(DROPPABLE_TIERS).fill(0)
    let seed = 42
    const rng = () => {
      // 簡單 LCG，可重現
      seed = (seed * 1664525 + 1013904223) % 2 ** 32
      return seed / 2 ** 32
    }
    for (let i = 0; i < 10000; i++) counts[pickDropTier(rng)]++
    expect(counts[0]).toBeGreaterThan(counts[DROPPABLE_TIERS - 1])
  })
})

describe('每日挑戰種子', () => {
  it('同種子 → 同星球序列（決定性）', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 20 }, () => pickDropTier(a))
    const seqB = Array.from({ length: 20 }, () => pickDropTier(b))
    expect(seqA).toEqual(seqB)
  })

  it('不同日期 → 不同種子', () => {
    expect(dailySeed(new Date('2026-06-12T10:00:00'))).not.toBe(
      dailySeed(new Date('2026-06-13T10:00:00')),
    )
  })

  it('同一天不同時間 → 同種子', () => {
    expect(dailySeed(new Date('2026-06-12T00:01:00'))).toBe(
      dailySeed(new Date('2026-06-12T23:59:00')),
    )
  })

  it('mulberry32 輸出落在 [0, 1)', () => {
    const rng = mulberry32(hashString('test'))
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('ComboTracker', () => {
  it('時間窗內連續合成，倍率遞增', () => {
    const c = new ComboTracker(1500, 8)
    expect(c.hit(0)).toBe(1)
    expect(c.hit(500)).toBe(2)
    expect(c.hit(1000)).toBe(3)
  })

  it('超出時間窗就重置回 1x', () => {
    const c = new ComboTracker(1500, 8)
    c.hit(0)
    c.hit(500)
    expect(c.hit(5000)).toBe(1)
  })

  it('倍率不超過上限', () => {
    const c = new ComboTracker(1500, 8)
    let m = 0
    for (let i = 0; i < 20; i++) m = c.hit(i * 100)
    expect(m).toBe(8)
  })

  it('current() 回報目前連鎖狀態', () => {
    const c = new ComboTracker(1500, 8)
    c.hit(0)
    c.hit(300)
    expect(c.current(1000)).toBe(2)
    expect(c.current(5000)).toBe(0)
  })
})
