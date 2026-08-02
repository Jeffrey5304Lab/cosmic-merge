import { DROPPABLE_TIERS, MAX_TIER } from './planets'

/** 合成得分：與西瓜遊戲相同的三角數列（合出 tier n 得 (n+1)(n+2)/2 分） */
export function mergeScore(resultTier: number): number {
  return ((resultTier + 1) * (resultTier + 2)) / 2
}

/** 超新星得分：兩顆太陽相撞爆炸的基礎分（高於合出太陽的 66，連鎖倍率照乘） */
export const SUPERNOVA_SCORE = 100

/**
 * 抽下一顆投放星球：小星球權重高，且不超過可投放上限。
 * rng 可注入以便測試。
 */
export function pickDropTier(rng: () => number = Math.random): number {
  // 權重：tier 0 最常見，遞減（小起手＝更多空間建鏈，是西瓜類爬頂的關鍵）
  const weights = [10, 8, 6, 4, 2]
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (let t = 0; t < weights.length && t < DROPPABLE_TIERS; t++) {
    roll -= weights[t]
    if (roll < 0) return t
  }
  return 0
}

/** 決定性 PRNG（mulberry32）：同種子＝同輸出序列，供測試固定亂數用 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 兩顆同階星球合體後的階級。
 * topUnlocked＝目前可合成到的最高階（太陽＋已發現恆星數，見 discovery.ts）；
 * 撞到這一階回傳 null → 塌陷成黑洞、吞噬全場、發現下一顆恆星。
 */
export function nextTier(tier: number, topUnlocked: number = MAX_TIER): number | null {
  return tier >= topUnlocked ? null : tier + 1
}

/** 連鎖計分：時間窗內連續合成，倍率遞增（1x → 2x → 3x …，上限 8x） */
export class ComboTracker {
  private lastMergeAt = -Infinity
  private chain = 0
  private windowMs: number
  private maxMultiplier: number

  constructor(windowMs = 1500, maxMultiplier = 8) {
    this.windowMs = windowMs
    this.maxMultiplier = maxMultiplier
  }

  /** 回報一次合成，回傳本次倍率 */
  hit(now: number): number {
    this.chain = now - this.lastMergeAt <= this.windowMs ? this.chain + 1 : 1
    this.lastMergeAt = now
    return Math.min(this.chain, this.maxMultiplier)
  }

  /** 目前連鎖數（供 UI 顯示） */
  current(now: number): number {
    return now - this.lastMergeAt <= this.windowMs ? this.chain : 0
  }
}
