/** 星球階級設定：從隕石合到太陽（0-10），再往上是黑洞後陸續「發現」的系外恆星（11-18） */
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
  /** 是否自體發光（太陽＋系外恆星） */
  glow?: boolean
  /**
   * 恆星光冕樣式（tier 11+ 各具特色；未設定＝太陽的三角光芒）：
   * flare=紅矮星閃焰、diffraction=相機繞射星芒、rays=放射長芒、
   * soft=柔和藍白光暈、giant=巨星翻騰光暈、north=北極星大四芒
   */
  starStyle?: 'flare' | 'diffraction' | 'rays' | 'soft' | 'giant' | 'north'
  /** 光冕/光暈色 'r, g, b'（未設定＝太陽暖橘） */
  corona?: string
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
  { tier: 7,  name: 'Uranus',  emoji: '🩵', radius: 75,  color: '#93CFD3', edge: '#62A6AC' },
  { tier: 8,  name: 'Saturn',  emoji: '🪐', radius: 82,  color: '#E3B264', edge: '#BB8A3C', ring: true },
  { tier: 9,  name: 'Jupiter', emoji: '🟠', radius: 89,  color: '#E09F69', edge: '#B97742' },
  { tier: 10, name: 'Sun',     emoji: '☀️', radius: 94,  color: '#F3CB57', edge: '#D9A431', glow: true },
  // ── 系外恆星（黑洞吞噬後逐顆發現，跨局永久保存；見 discovery.ts） ──
  // 依真實光譜特性給各自的光冕樣式與光冕色，讓每顆恆星一眼可辨、各有帥氣個性
  { tier: 11, name: 'Proxima',    emoji: '🔴', radius: 102, color: '#E0705A', edge: '#B54C38', glow: true, starStyle: 'flare',       corona: '236, 104, 82'  }, // 紅矮星：週期性閃焰
  { tier: 12, name: 'Sirius',     emoji: '⚪', radius: 104, color: '#E4EEF8', edge: '#A9C1D8', glow: true, starStyle: 'diffraction', corona: '214, 232, 252' }, // 全天最亮：銳利繞射星芒
  { tier: 13, name: 'Vega',       emoji: '🔵', radius: 106, color: '#B7CBEF', edge: '#8199CC', glow: true, starStyle: 'soft',        corona: '160, 190, 245' }, // 藍白：柔和冷光暈
  { tier: 14, name: 'Arcturus',   emoji: '🟠', radius: 108, color: '#EFA75A', edge: '#C67F35', glow: true, starStyle: 'giant',       corona: '244, 168, 88'  }, // 橙巨星：暖色翻騰
  { tier: 15, name: 'Rigel',      emoji: '💠', radius: 110, color: '#93ACEC', edge: '#6379BE', glow: true, starStyle: 'rays',        corona: '150, 178, 255' }, // 藍超巨星：熾烈放射長芒
  { tier: 16, name: 'Betelgeuse', emoji: '🔻', radius: 112, color: '#D95B43', edge: '#A93E2C', glow: true, starStyle: 'giant',       corona: '224, 84, 62'   }, // 紅超巨星：巨大脈動翻騰
  { tier: 17, name: 'Deneb',      emoji: '🤍', radius: 114, color: '#CFDBF4', edge: '#93A8D4', glow: true, starStyle: 'rays',        corona: '206, 220, 248' }, // 白超巨星：清亮放射
  { tier: 18, name: 'Polaris',    emoji: '🌟', radius: 116, color: '#F4E7C2', edge: '#CBB98F', glow: true, starStyle: 'north',       corona: '246, 226, 152' }, // 北極星：標誌性大四芒
]

export const MAX_TIER = TIERS.length - 1

/** 太陽的階級：0-10 是「行星進化鏈」的終點，11 以上是系外恆星 */
export const SUN_TIER = 10

/** 玩家可投放的最大階級（同西瓜遊戲只掉小果） */
export const DROPPABLE_TIERS = 5

/** 遊戲場地尺寸（邏輯座標，渲染時等比縮放） */
export const BOARD = {
  width: 460,
  height: 660,
  /** 投放高度 */
  dropY: 70,
  /** 超過此線且靜止 → 遊戲結束（128→110：略拉高警戒線，給技巧玩家更多堆疊空間爬到太陽） */
  loseY: 110,
  wallThickness: 60,
} as const
