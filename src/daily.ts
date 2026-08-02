/**
 * 每日連續登入（streak）：跨天回訪給獎勵、斷天重置，持久化於 localStorage。
 * 獎勵是免費錘子（基礎 +2；連續 3 天／每 7 天里程碑加碼）。
 */
const KEY = 'cosmic-merge:daily'

export interface DailyState {
  /** 上次領取日 'YYYY-MM-DD'；'' = 從未領過 */
  lastClaim: string
  /** 目前連續天數 */
  streak: number
}

export interface DailyReward {
  streak: number
  hammers: number
  /** 是否為里程碑日（有加碼，UI 特別標示） */
  milestone: boolean
}

/** 本地日期 key（用裝置當地時區，跨「日曆日」才算新的一天） */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 兩個 YYYY-MM-DD 相差天數（b - a） */
function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

function load(): DailyState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<DailyState>
      if (typeof s.lastClaim === 'string' && typeof s.streak === 'number') {
        return { lastClaim: s.lastClaim, streak: s.streak }
      }
    }
  } catch {
    /* 私密模式／壞資料：當作全新 */
  }
  return { lastClaim: '', streak: 0 }
}

function save(s: DailyState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 私密模式忽略 */
  }
}

/** 領取後 streak 應該是多少（前一天有領＝續連；否則從 1 重來） */
function nextStreak(s: DailyState, today: string): number {
  return s.lastClaim && daysBetween(s.lastClaim, today) === 1 ? s.streak + 1 : 1
}

/** 某個 streak 天數對應的獎勵（基礎 +2；每 7 天大里程碑 +5、第 3 天小里程碑 +2） */
export function rewardFor(streak: number): DailyReward {
  let hammers = 2
  let milestone = false
  if (streak > 0 && streak % 7 === 0) {
    hammers += 5
    milestone = true
  } else if (streak === 3) {
    hammers += 2
    milestone = true
  }
  return { streak, hammers, milestone }
}

/** 今天是否還有可領的每日獎勵（今天尚未領過） */
export function dailyAvailable(today = dayKey()): boolean {
  return load().lastClaim !== today
}

/** 預覽今天領取後的 streak 與獎勵（不寫入）；今天已領過回傳 null */
export function peekDaily(today = dayKey()): DailyReward | null {
  const s = load()
  if (s.lastClaim === today) return null
  return rewardFor(nextStreak(s, today))
}

/** 領取今天的每日獎勵：更新 streak/lastClaim 並回傳獎勵；今天已領過回傳 null */
export function claimDaily(today = dayKey()): DailyReward | null {
  const s = load()
  if (s.lastClaim === today) return null
  const streak = nextStreak(s, today)
  save({ lastClaim: today, streak })
  return rewardFor(streak)
}

/** 測試用：重置每日狀態 */
export function resetDaily() {
  save({ lastClaim: '', streak: 0 })
}
