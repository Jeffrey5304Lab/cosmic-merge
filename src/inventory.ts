/** 道具庫存：localStorage 持久化 */
const KEY = 'cosmic-merge:hammers'
const STARTING_HAMMERS = 1

export function getHammers(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return STARTING_HAMMERS // 新玩家送一支體驗
    return Math.max(0, Number(raw) || 0)
  } catch {
    return STARTING_HAMMERS
  }
}

function save(n: number) {
  try {
    localStorage.setItem(KEY, String(n))
  } catch {
    /* 私密模式忽略 */
  }
}

export function addHammer(count = 1): number {
  const n = getHammers() + count
  save(n)
  return n
}

/** 消耗一支；庫存不足回傳 null */
export function useHammer(): number | null {
  const n = getHammers()
  if (n <= 0) return null
  save(n - 1)
  return n - 1
}
