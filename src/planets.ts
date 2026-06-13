/** 星球階級設定：從隕石一路合到太陽，共 11 級 */
export interface PlanetTier {
  /** 階級索引 0-10 */
  tier: number
  name: string
  emoji: string
  radius: number
  /** 主色（漸層中心） */
  color: string
  /** 邊緣色（漸層外圈） */
  edge: string
  /** 是否有行星環（土星） */
  ring?: boolean
  /** 是否自體發光（太陽） */
  glow?: boolean
}

/** 手繪紙感配色：color = 主色塊（粉彩），edge = 紙剪陰影色 */
export const TIERS: PlanetTier[] = [
  { tier: 0,  name: 'Meteor',  emoji: '🪨', radius: 17,  color: '#BCB0A0', edge: '#978A77' },
  { tier: 1,  name: 'Moon',    emoji: '🌙', radius: 24,  color: '#EFE4CF', edge: '#CDBFA5' },
  { tier: 2,  name: 'Mercury', emoji: '☿️', radius: 32,  color: '#E7BD6F', edge: '#C19140' },
  { tier: 3,  name: 'Mars',    emoji: '🔴', radius: 40,  color: '#DD7257', edge: '#B54E36' },
  { tier: 4,  name: 'Venus',   emoji: '✨', radius: 50,  color: '#F0BC8C', edge: '#CE9159' },
  { tier: 5,  name: 'Earth',   emoji: '🌍', radius: 61,  color: '#82ABD8', edge: '#5E86B5' },
  { tier: 6,  name: 'Neptune', emoji: '🔵', radius: 73,  color: '#8590CB', edge: '#5F6AA8' },
  { tier: 7,  name: 'Uranus',  emoji: '🩵', radius: 86,  color: '#93CFD3', edge: '#62A6AC' },
  { tier: 8,  name: 'Saturn',  emoji: '🪐', radius: 100, color: '#E3B264', edge: '#BB8A3C', ring: true },
  { tier: 9,  name: 'Jupiter', emoji: '🟠', radius: 116, color: '#E09F69', edge: '#B97742' },
  { tier: 10, name: 'Sun',     emoji: '☀️', radius: 134, color: '#F3CB57', edge: '#D9A431', glow: true },
]

export const MAX_TIER = TIERS.length - 1

/** 玩家可投放的最大階級（同西瓜遊戲只掉小果） */
export const DROPPABLE_TIERS = 5

/** 遊戲場地尺寸（邏輯座標，渲染時等比縮放） */
export const BOARD = {
  width: 460,
  height: 660,
  /** 投放高度 */
  dropY: 70,
  /** 超過此線且靜止 → 遊戲結束 */
  loseY: 128,
  wallThickness: 60,
} as const
