/** 星球階級設定：從隕石一路合到太陽，共 11 級 */
export interface PlanetTier {
  /** 階級索引 0-10 */
  tier: number
  name: string
  nameEn: string
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

export const TIERS: PlanetTier[] = [
  { tier: 0,  name: '隕石',   nameEn: 'Meteor',  emoji: '🪨', radius: 17,  color: '#A8A29E', edge: '#57534E' },
  { tier: 1,  name: '月球',   nameEn: 'Moon',    emoji: '🌙', radius: 24,  color: '#E7E5E4', edge: '#A8A29E' },
  { tier: 2,  name: '水星',   nameEn: 'Mercury', emoji: '☿️', radius: 32,  color: '#FCD34D', edge: '#B45309' },
  { tier: 3,  name: '火星',   nameEn: 'Mars',    emoji: '🔴', radius: 40,  color: '#F87171', edge: '#B91C1C' },
  { tier: 4,  name: '金星',   nameEn: 'Venus',   emoji: '✨', radius: 50,  color: '#FDBA74', edge: '#C2410C' },
  { tier: 5,  name: '地球',   nameEn: 'Earth',   emoji: '🌍', radius: 61,  color: '#60A5FA', edge: '#1D4ED8' },
  { tier: 6,  name: '海王星', nameEn: 'Neptune', emoji: '🔵', radius: 73,  color: '#818CF8', edge: '#3730A3' },
  { tier: 7,  name: '天王星', nameEn: 'Uranus',  emoji: '🩵', radius: 86,  color: '#67E8F9', edge: '#0E7490' },
  { tier: 8,  name: '土星',   nameEn: 'Saturn',  emoji: '🪐', radius: 100, color: '#FBBF24', edge: '#92400E', ring: true },
  { tier: 9,  name: '木星',   nameEn: 'Jupiter', emoji: '🟠', radius: 116, color: '#FB923C', edge: '#9A3412' },
  { tier: 10, name: '太陽',   nameEn: 'Sun',     emoji: '☀️', radius: 134, color: '#FDE047', edge: '#EA580C', glow: true },
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
