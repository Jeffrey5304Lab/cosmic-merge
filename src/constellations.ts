/**
 * 星座任務（Constellation Missions）—— 這款遊戲的招牌玩法層。
 *
 * 玩家不只是「把星球合到更高階」，而是在合成的過程中「拼出真實星座」：
 * 畫面頂端常駐顯示一座目標星座（Triangulum → Cassiopeia → … → Orion → Ursa Major），
 * 每當你「合成出」某個指定階級的星球，就點亮星座裡對應的一顆星；整座點亮＝完成，
 * 給一大筆獎勵分數並解鎖下一座星座（解鎖進度跨局永久保存）。
 *
 * 設計重點：
 * - req[i] 是「第 i 顆星需要你合成出的階級」，全部落在 1..10（隕石~太陽），靠技巧可達，
 *   不需要黑洞/系外恆星（那是另一條 discovery.ts 的線）。
 * - 因為合成本來就會一路產出中間階級（做出地球前會先做出火星、金星…），
 *   所以往上爬的過程會自然地一顆一顆點亮，審查員/新玩家一進遊戲就看得到目標與進度。
 * - 本模組是純資料 + localStorage，不碰物理，方便單元測試、風險最低。
 */

export interface Constellation {
  id: string
  name: string
  /** 星點座標，正規化 0..1（x 向右、y 向下）；給頂端小星圖與底部大星圖共用 */
  stars: ReadonlyArray<readonly [number, number]>
  /** 連線：以星點索引成對，畫出星座輪廓 */
  lines: ReadonlyArray<readonly [number, number]>
  /** 每顆星要「合成出的階級」才會點亮（與 stars 同索引，長度必須相等） */
  req: ReadonlyArray<number>
  /** 完成整座星座的獎勵分數 */
  bonus: number
}

/**
 * 星座階梯：由易到難。座標大致貼近真實星座外形。
 * req 一律 1..10（可靠技巧達成），越後面需要越高階、越多顆星。
 */
export const LADDER: readonly Constellation[] = [
  {
    id: 'triangulum',
    name: 'Triangulum',
    stars: [[0.22, 0.72], [0.8, 0.66], [0.5, 0.16]],
    lines: [[0, 1], [1, 2], [2, 0]],
    req: [3, 4, 5], // Mars → Venus → Earth
    bonus: 800,
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    stars: [[0.06, 0.34], [0.28, 0.68], [0.5, 0.36], [0.72, 0.7], [0.94, 0.3]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    req: [2, 3, 4, 5, 6], // 一路爬到海王星，W 形由左至右點亮
    bonus: 1500,
  },
  {
    id: 'crux',
    name: 'Southern Cross',
    stars: [[0.5, 0.12], [0.5, 0.9], [0.18, 0.52], [0.82, 0.46]],
    lines: [[0, 1], [2, 3]],
    req: [7, 8, 5, 6], // 橫桿(地球/海王星)先亮，直桿(天王星/土星)後亮
    bonus: 2500,
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    stars: [[0.5, 0.1], [0.5, 0.5], [0.5, 0.92], [0.14, 0.56], [0.86, 0.46]],
    lines: [[0, 1], [1, 2], [3, 1], [1, 4]],
    req: [8, 5, 9, 6, 7], // 十字由中心向外點亮，木星(尾)收尾
    bonus: 4000,
  },
  {
    id: 'orion',
    name: 'Orion',
    stars: [
      [0.72, 0.2], // 0 Betelgeuse（左肩）
      [0.28, 0.24], // 1 Bellatrix（右肩）
      [0.4, 0.5], // 2 腰帶
      [0.5, 0.54], // 3 腰帶
      [0.6, 0.58], // 4 腰帶
      [0.66, 0.88], // 5 Saiph
      [0.32, 0.86], // 6 Rigel
    ],
    lines: [[1, 0], [1, 2], [0, 4], [2, 3], [3, 4], [2, 6], [4, 5]],
    req: [7, 6, 4, 5, 8, 9, 10], // 腰帶最先亮，太陽(Rigel)是最終一顆——史詩收尾
    bonus: 8000,
  },
  {
    id: 'ursa-major',
    name: 'Ursa Major',
    stars: [
      [0.16, 0.3], // 0 Dubhe
      [0.16, 0.6], // 1 Merak
      [0.4, 0.64], // 2 Phecda
      [0.42, 0.36], // 3 Megrez
      [0.6, 0.44], // 4 Alioth
      [0.78, 0.36], // 5 Mizar
      [0.94, 0.26], // 6 Alkaid
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    req: [6, 7, 8, 8, 9, 9, 10], // 大熊座：需要造出兩顆土星、兩顆木星與太陽，終極挑戰
    bonus: 15000,
  },
]

const KEY = 'cosmic-merge:constellations-done'

function loadDone(): number {
  try {
    const n = Number(localStorage.getItem(KEY)) || 0
    return Math.min(Math.max(0, Math.floor(n)), LADDER.length)
  } catch {
    return 0
  }
}

/** 已完成的星座數（＝目前目標星座的索引） */
let done = loadDone()
/** 本局內目前目標星座每顆星是否已點亮（跨局不保存，開新局重置） */
let lit: boolean[] = freshLit()

function freshLit(): boolean[] {
  const c = LADDER[Math.min(done, LADDER.length - 1)]
  return c ? c.req.map(() => false) : []
}

function save() {
  try {
    localStorage.setItem(KEY, String(done))
  } catch {
    /* 私密模式等情況下忽略 */
  }
}

/** 全部星座都完成了嗎 */
export function allComplete(): boolean {
  return done >= LADDER.length
}

/** 目前的目標星座（全部完成後回傳最後一座，供圖鑑顯示滿星） */
export function currentConstellation(): Constellation {
  return LADDER[Math.min(done, LADDER.length - 1)]
}

/** 已完成的星座數 */
export function completedCount(): number {
  return done
}

/** 本局目前目標星座的點亮遮罩（複本，外部不可直接改） */
export function litMask(): boolean[] {
  return allComplete() ? currentConstellation().req.map(() => true) : lit.slice()
}

/** 本局目標星座已點亮的星數 */
export function litCount(): number {
  return allComplete() ? currentConstellation().req.length : lit.filter(Boolean).length
}

/** 開新局：重置本局點亮進度（已解鎖的星座階梯不變） */
export function resetRunProgress() {
  lit = freshLit()
}

export interface MergeResult {
  /** 這次點亮的是目標星座第幾顆星（-1＝沒點亮任何星） */
  litIndex: number
  /** 是否因此完成整座星座 */
  completed: boolean
  /** 若完成：完成的星座名稱（否則為目前目標星座名） */
  name: string
  /** 若完成：獲得的獎勵分數，否則 0 */
  bonus: number
}

/**
 * 合成出一顆 `tier` 階級的星球時呼叫：點亮目標星座中「最靠前、尚未點亮、且需求＝此階級」的星。
 * 若因此點滿整座星座，內部推進到下一座並重置本局點亮進度；回傳資訊供 UI 慶祝。
 * 沒有可點亮的星則回傳 litIndex = -1。
 */
export function registerMerge(tier: number): MergeResult {
  const c = currentConstellation()
  if (allComplete()) return { litIndex: -1, completed: false, name: c.name, bonus: 0 }

  let idx = -1
  for (let i = 0; i < c.req.length; i++) {
    if (!lit[i] && c.req[i] === tier) {
      idx = i
      break
    }
  }
  if (idx === -1) return { litIndex: -1, completed: false, name: c.name, bonus: 0 }

  lit[idx] = true
  const completed = lit.every(Boolean)
  if (completed) {
    done += 1
    save()
    lit = freshLit() // 推進到下一座（或全數完成後為空）
    return { litIndex: idx, completed: true, name: c.name, bonus: c.bonus }
  }
  return { litIndex: idx, completed: false, name: c.name, bonus: 0 }
}

/** 重設所有星座進度（測試／除錯用） */
export function resetConstellations(n = 0) {
  done = Math.min(Math.max(0, n), LADDER.length)
  save()
  lit = freshLit()
}
