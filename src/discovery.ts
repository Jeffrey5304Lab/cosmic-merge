/**
 * 恆星發現進度：黑洞吞噬全場後「發現」下一顆系外恆星（Proxima → … → Polaris）。
 * 跨局永久保存（localStorage）——之後每一局，太陽+太陽會直接合成已發現的恆星，
 * 只有「目前最高的恆星」互撞才會塌陷成黑洞、再發現下一顆。
 */
import { MAX_TIER, SUN_TIER } from './planets'

const KEY = 'cosmic-merge:stars-discovered'

function load(): number {
  try {
    const n = Number(localStorage.getItem(KEY)) || 0
    return Math.min(Math.max(0, Math.floor(n)), MAX_TIER - SUN_TIER)
  } catch {
    return 0
  }
}

/** 已發現的恆星數（0 = 只到太陽），程式存活期間快取在記憶體 */
let count = load()

function save() {
  try {
    localStorage.setItem(KEY, String(count))
  } catch {
    /* 私密模式等情況下忽略 */
  }
}

/** 已發現的系外恆星數（0~8） */
export function discoveredCount(): number {
  return count
}

/** 目前可合成到的最高階級：太陽 + 已發現恆星數。互撞這一階＝黑洞 */
export function topUnlockedTier(): number {
  return SUN_TIER + count
}

/** 黑洞結算時發現下一顆恆星：回傳新恆星階級；全部發現完則回傳 null */
export function discoverNext(): number | null {
  if (SUN_TIER + count >= MAX_TIER) return null
  count += 1
  save()
  return SUN_TIER + count
}

/** 重設發現進度（測試／除錯用） */
export function resetDiscovery(n = 0) {
  count = Math.min(Math.max(0, n), MAX_TIER - SUN_TIER)
  save()
}
