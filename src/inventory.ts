/** 道具庫存：localStorage 持久化 */
const KEY = 'cosmic-merge:hammers'
const STARTING_HAMMERS = 3
/** 每局開局至少保底的免費錘子數（不足補到此數；多的保留）。廣告用來「想要更多」而非「才有得用」 */
export const FREE_HAMMER_FLOOR = 3

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

/**
 * 開局保底：若庫存低於免費樓地板就補到樓地板（多的保留）。
 * 讓每局都至少有幾支免費錘子可用，廣告只是「想要更多」的選項。
 */
export function refillFreeHammers(floor = FREE_HAMMER_FLOOR): number {
  const n = getHammers()
  if (n < floor) {
    save(floor)
    return floor
  }
  return n
}
