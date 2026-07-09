/** 終身個人統計：localStorage 持久化，跨場累計 */
import { MAX_TIER } from './planets'

export interface Stats {
  /** 玩過的總場數 */
  games: number
  /** 歷史最高分 */
  bestScore: number
  /** 歷史合成到的最高階級（0-10） */
  maxTier: number
  /** 歷史最佳連鎖倍率 */
  bestCombo: number
  /** 累計合成次數 */
  totalMerges: number
  /** 合成出太陽的次數 */
  suns: number
  /** 兩顆太陽相撞爆成超新星的次數 */
  supernovas: number
}

const KEY = 'cosmic-merge:stats'

const EMPTY: Stats = {
  games: 0,
  bestScore: 0,
  maxTier: 0,
  bestCombo: 0,
  totalMerges: 0,
  suns: 0,
  supernovas: 0,
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<Stats>
    return {
      games: num(parsed.games),
      bestScore: num(parsed.bestScore),
      maxTier: num(parsed.maxTier),
      bestCombo: num(parsed.bestCombo),
      totalMerges: num(parsed.totalMerges),
      suns: num(parsed.suns),
      supernovas: num(parsed.supernovas),
    }
  } catch {
    return { ...EMPTY }
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0
}

function save(s: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 私密模式忽略 */
  }
}

/** 記錄一次合成（更新最高階級、總合成數、太陽數） */
export function recordMerge(resultTier: number): Stats {
  const s = loadStats()
  s.totalMerges += 1
  s.maxTier = Math.max(s.maxTier, resultTier)
  if (resultTier >= MAX_TIER) s.suns += 1
  save(s)
  return s
}

/** 記錄一次超新星（兩顆太陽相撞爆炸） */
export function recordSupernova(): Stats {
  const s = loadStats()
  s.supernovas += 1
  save(s)
  return s
}

/** 記錄一次連鎖倍率（更新最佳 combo） */
export function recordCombo(multiplier: number): Stats {
  const s = loadStats()
  if (multiplier > s.bestCombo) {
    s.bestCombo = multiplier
    save(s)
  }
  return s
}

/** 記錄一局結束（場數 +1、更新最高分與最高階級） */
export function recordGame(score: number, maxTier: number): Stats {
  const s = loadStats()
  s.games += 1
  s.bestScore = Math.max(s.bestScore, score)
  s.maxTier = Math.max(s.maxTier, maxTier)
  save(s)
  return s
}

/** 撤回剛才那次場數計算（玩家復活續玩 → 本局尚未真正結束） */
export function undoGameCount(): Stats {
  const s = loadStats()
  s.games = Math.max(0, s.games - 1)
  save(s)
  return s
}
