/** 本地排行榜：localStorage 保存前 10 名 */
export interface LeaderboardEntry {
  score: number
  maxTier: number
  /** YYYY-MM-DD */
  date: string
  mode: 'classic' | 'daily'
}

const KEY = 'cosmic-merge:leaderboard'
export const MAX_ENTRIES = 10

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is LeaderboardEntry =>
        typeof e === 'object' && e !== null && typeof (e as LeaderboardEntry).score === 'number',
    )
  } catch {
    return []
  }
}

/**
 * 插入一筆成績，回傳名次（1-based）；沒上榜回傳 null。
 * 純函式版本（addScore 的核心），方便測試。
 */
export function insertEntry(
  board: LeaderboardEntry[],
  entry: LeaderboardEntry,
): { board: LeaderboardEntry[]; rank: number | null } {
  if (entry.score <= 0) return { board, rank: null }
  const next = [...board, entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES)
  const rank = next.indexOf(entry)
  return { board: next, rank: rank === -1 ? null : rank + 1 }
}

/** 記錄一局成績並存檔，回傳名次（沒上榜 null） */
export function addScore(entry: LeaderboardEntry): number | null {
  const { board, rank } = insertEntry(loadLeaderboard(), entry)
  try {
    localStorage.setItem(KEY, JSON.stringify(board))
  } catch {
    /* 私密模式忽略 */
  }
  return rank
}
