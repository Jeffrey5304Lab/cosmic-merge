import { describe, expect, it } from 'vitest'
import { insertEntry, MAX_ENTRIES, type LeaderboardEntry } from './leaderboard'

function entry(score: number, mode: 'classic' | 'daily' = 'classic'): LeaderboardEntry {
  return { score, maxTier: 5, date: '2026-06-12', mode }
}

describe('排行榜 insertEntry', () => {
  it('空榜插入 → 第 1 名', () => {
    const { board, rank } = insertEntry([], entry(100))
    expect(rank).toBe(1)
    expect(board).toHaveLength(1)
  })

  it('依分數排序，名次正確', () => {
    let board: LeaderboardEntry[] = []
    board = insertEntry(board, entry(50)).board
    board = insertEntry(board, entry(200)).board
    const { rank } = insertEntry(board, entry(120))
    expect(rank).toBe(2)
  })

  it('滿 10 筆後低分擠不進去', () => {
    let board: LeaderboardEntry[] = []
    for (let i = 1; i <= MAX_ENTRIES; i++) {
      board = insertEntry(board, entry(i * 100)).board
    }
    const { board: after, rank } = insertEntry(board, entry(1))
    expect(rank).toBeNull()
    expect(after).toHaveLength(MAX_ENTRIES)
  })

  it('滿榜時的新高分會擠掉最後一名', () => {
    let board: LeaderboardEntry[] = []
    for (let i = 1; i <= MAX_ENTRIES; i++) {
      board = insertEntry(board, entry(i * 100)).board
    }
    const { board: after, rank } = insertEntry(board, entry(9999))
    expect(rank).toBe(1)
    expect(after).toHaveLength(MAX_ENTRIES)
    expect(after.some(e => e.score === 100)).toBe(false)
  })

  it('0 分不進榜', () => {
    const { rank } = insertEntry([], entry(0))
    expect(rank).toBeNull()
  })
})
