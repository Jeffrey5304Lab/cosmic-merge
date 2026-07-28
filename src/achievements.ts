/** 成就系統：定義 + 解鎖狀態（localStorage），條件用終身統計判定 */
import type { Stats } from './stats'

export interface Achievement {
  id: string
  /** 顯示用圖示：手繪風 inline SVG（ink 描邊 + honey 填色，與工具列一致，不用 emoji） */
  icon: string
  name: string
  desc: string
  /** 達成條件（以終身統計判定） */
  test: (s: Stats) => boolean
}

/* ── 手繪風 SVG 圖示（viewBox 0 0 24 24；描邊/填色由 CSS .achv-row .ico svg 控制） ── */
const I = {
  earth: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#82ABD8"/><path d="M6.5 10c2-1 3.2 0 4 1s-1 3-3 2.5-2.4-2.4-1-3.5z" fill="#7FB98A" stroke="none"/><path d="M13.5 13.2c1.5-.5 3 .3 3 1.6s-2 1.9-3 1z" fill="#7FB98A" stroke="none"/></svg>',
  saturn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="11" r="5.4" fill="#E3B264"/><ellipse cx="12" cy="11" rx="10" ry="3" fill="none" transform="rotate(-20 12 11)"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><g stroke="var(--honey)" stroke-width="2.4"><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.8 5.8l1.8 1.8M16.4 16.4l1.8 1.8M18.2 5.8l-1.8 1.8M7.6 16.4l-1.8 1.8"/></g><circle cx="12" cy="12" r="4.8" fill="var(--honey)"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 5.5 13H11l-1.5 9L18.5 10H12.5z" fill="var(--honey)"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3 2.2-4 .4 1 .8 1.6 1.6 2 .2-3 0-5.6-.8-8z" fill="var(--honey)"/></svg>',
  burst: '<svg viewBox="0 0 24 24"><path d="M12 2l2 7 7-2-5 5 5 5-7-2-2 7-2-7-7 2 5-5-5-5 7 2z" fill="var(--honey)"/></svg>',
  nova: '<svg viewBox="0 0 24 24"><path d="M12 1.5 13.5 8.4 19.4 4.6 15.6 10.5 22.5 12 15.6 13.5 19.4 19.4 13.5 15.6 12 22.5 10.5 15.6 4.6 19.4 8.4 13.5 1.5 12 8.4 10.5 4.6 4.6 10.5 8.4z" fill="var(--honey)"/><circle cx="12" cy="12" r="2.4" fill="var(--ink)" stroke="none"/></svg>',
  starOutline: '<svg viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.2 5.7.8-4.1 4 1 5.7L12 16.3 7 19l1-5.7-4.1-4 5.7-.8z" fill="none"/></svg>',
  starFill: '<svg viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.2 5.7.8-4.1 4 1 5.7L12 16.3 7 19l1-5.7-4.1-4 5.7-.8z" fill="var(--honey)"/></svg>',
  starSparkle: '<svg viewBox="0 0 24 24"><path d="M10.5 3.4l2.3 4.6 5 .7-3.6 3.5.9 5-4.5-2.4L6 19.2l.9-5L3.2 8.7l5-.7z" fill="var(--honey)"/><path d="M18 13.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="var(--honey)" stroke="none"/></svg>',
  controller: '<svg viewBox="0 0 24 24"><rect x="3" y="8.5" width="18" height="8" rx="4" fill="var(--honey)"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.8" r=".95" fill="var(--ink)" stroke="none"/><circle cx="17.8" cy="13.8" r=".95" fill="var(--ink)" stroke="none"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><path d="M9 3l2.2 6M15 3l-2.2 6"/><circle cx="12" cy="15" r="5" fill="var(--honey)"/><path d="M12 12.5l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.85-1.6.85.3-1.8-1.3-1.3 1.8-.3z" fill="var(--ink)" stroke="none"/></svg>',
  merge: '<svg viewBox="0 0 24 24"><circle cx="9.5" cy="12" r="5.4" fill="none"/><circle cx="14.5" cy="12" r="5.4" fill="var(--honey)"/></svg>',
  chain: '<svg viewBox="0 0 24 24"><rect x="2.5" y="9" width="12" height="6" rx="3" fill="none"/><rect x="9.5" y="9" width="12" height="6" rx="3" fill="var(--honey)"/></svg>',
  telescope: '<svg viewBox="0 0 24 24"><path d="M3.5 9.5 15 4l2.4 5-11.5 5.5z" fill="var(--honey)"/><path d="M16.2 3.6l2.6 5.4"/><path d="M10 14.5l-2.2 6M12.6 14l2.6 6.5"/></svg>',
  north: '<svg viewBox="0 0 24 24"><path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" fill="var(--honey)"/><circle cx="12" cy="12" r="1.6" fill="var(--ink)" stroke="none"/></svg>',
}

/** 由小到大排列，方便在面板呈現進度感 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'earth', icon: I.earth, name: 'Blue Marble', desc: 'Merge up to Earth', test: s => s.maxTier >= 5 },
  { id: 'saturn', icon: I.saturn, name: 'Ringbearer', desc: 'Merge up to Saturn', test: s => s.maxTier >= 8 },
  { id: 'sun', icon: I.sun, name: 'Star Birth', desc: 'Create the Sun', test: s => s.maxTier >= 10 },
  { id: 'supernova', icon: I.nova, name: 'Supernova', desc: 'Collide two Suns', test: s => s.supernovas >= 1 },
  { id: 'discover1', icon: I.telescope, name: 'New Horizons', desc: 'Discover a star beyond the Sun', test: s => s.maxTier >= 11 },
  { id: 'polaris', icon: I.north, name: 'True North', desc: 'Discover Polaris, the final star', test: s => s.maxTier >= 18 },
  { id: 'combo3', icon: I.bolt, name: 'Chain x3', desc: 'Hit a ×3 combo', test: s => s.bestCombo >= 3 },
  { id: 'combo5', icon: I.flame, name: 'Chain x5', desc: 'Hit a ×5 combo', test: s => s.bestCombo >= 5 },
  { id: 'combo8', icon: I.burst, name: 'Chain Master', desc: 'Hit the max ×8 combo', test: s => s.bestCombo >= 8 },
  { id: 'score1k', icon: I.starOutline, name: 'Rookie', desc: 'Score 1,000', test: s => s.bestScore >= 1000 },
  { id: 'score5k', icon: I.starFill, name: 'Pro', desc: 'Score 5,000', test: s => s.bestScore >= 5000 },
  { id: 'score10k', icon: I.starSparkle, name: 'Cosmic', desc: 'Score 10,000', test: s => s.bestScore >= 10000 },
  { id: 'games10', icon: I.controller, name: 'Regular', desc: 'Play 10 games', test: s => s.games >= 10 },
  { id: 'games50', icon: I.medal, name: 'Devoted', desc: 'Play 50 games', test: s => s.games >= 50 },
  { id: 'merges100', icon: I.merge, name: 'Merger', desc: 'Merge 100 times', test: s => s.totalMerges >= 100 },
  { id: 'merges1000', icon: I.chain, name: 'Fusion Master', desc: 'Merge 1,000 times', test: s => s.totalMerges >= 1000 },
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
