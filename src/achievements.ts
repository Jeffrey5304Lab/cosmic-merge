/** 成就系統：定義 + 解鎖狀態（localStorage），條件用終身統計判定 */
import type { Stats } from './stats'

export interface Achievement {
  id: string
  /** 顯示用圖示（modal 內，emoji 可接受） */
  icon: string
  name: string
  desc: string
  /** 達成條件（以終身統計判定） */
  test: (s: Stats) => boolean
}

/** 由小到大排列，方便在面板呈現進度感 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'earth', icon: '🌍', name: 'Blue Marble', desc: 'Merge up to Earth', test: s => s.maxTier >= 5 },
  { id: 'saturn', icon: '🪐', name: 'Ringbearer', desc: 'Merge up to Saturn', test: s => s.maxTier >= 8 },
  { id: 'sun', icon: '☀️', name: 'Star Birth', desc: 'Create the Sun', test: s => s.maxTier >= 10 },
  { id: 'combo3', icon: '⚡', name: 'Chain x3', desc: 'Hit a ×3 combo', test: s => s.bestCombo >= 3 },
  { id: 'combo5', icon: '🔥', name: 'Chain x5', desc: 'Hit a ×5 combo', test: s => s.bestCombo >= 5 },
  { id: 'combo8', icon: '💥', name: 'Chain Master', desc: 'Hit the max ×8 combo', test: s => s.bestCombo >= 8 },
  { id: 'score1k', icon: '⭐', name: 'Rookie', desc: 'Score 1,000', test: s => s.bestScore >= 1000 },
  { id: 'score5k', icon: '🌟', name: 'Pro', desc: 'Score 5,000', test: s => s.bestScore >= 5000 },
  { id: 'score10k', icon: '✨', name: 'Cosmic', desc: 'Score 10,000', test: s => s.bestScore >= 10000 },
  { id: 'games10', icon: '🎮', name: 'Regular', desc: 'Play 10 games', test: s => s.games >= 10 },
  { id: 'games50', icon: '🏅', name: 'Devoted', desc: 'Play 50 games', test: s => s.games >= 50 },
  { id: 'merges100', icon: '🔗', name: 'Merger', desc: 'Merge 100 times', test: s => s.totalMerges >= 100 },
  { id: 'merges1000', icon: '🌌', name: 'Fusion Master', desc: 'Merge 1,000 times', test: s => s.totalMerges >= 1000 },
]

const KEY = 'cosmic-merge:achievements'

export function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    const arr: unknown = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveUnlocked(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {
    /* 私密模式忽略 */
  }
}

/**
 * 依目前統計檢查並解鎖達標的成就，回傳「本次新解鎖」的清單（給彈窗提示用）。
 */
export function evaluateAchievements(stats: Stats): Achievement[] {
  const unlocked = loadUnlocked()
  const newly: Achievement[] = []
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.test(stats)) {
      unlocked.add(a.id)
      newly.push(a)
    }
  }
  if (newly.length > 0) saveUnlocked(unlocked)
  return newly
}
