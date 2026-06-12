/** 極簡 i18n：zh-TW / en，偵測瀏覽器語言、localStorage 記憶、執行期切換 */
import { TIERS } from './planets'

export type Lang = 'zh-TW' | 'en'

const STORAGE_KEY = 'cosmic-merge:lang'

interface Dict {
  docTitle: string
  /** 標題拆兩段做雙色 */
  title1: string
  title2: string
  score: string
  best: string
  next: string
  evolution: string
  mute: string
  overTitle: string
  /** 結算分數行（含 <strong>） */
  overScore: (score: number) => string
  overNewRecord: (planet: string) => string
  overNormal: (planet: string, best: number) => string
  restart: string
  share: string
  shareDone: string
  daily: string
  dailyBest: (score: number) => string
  leaderboard: string
  noScores: string
  revive: string
  swap: string
  hammer: string
  hammerHint: string
  adLoading: string
  /** 語言切換鈕顯示「切過去的語言」 */
  langButton: string
  tutorial: string
}

const dicts: Record<Lang, Dict> = {
  'zh-TW': {
    docTitle: '宇宙合併 Cosmic Merge',
    title1: '宇宙',
    title2: '合併',
    score: '分數',
    best: '最佳',
    next: '下一顆',
    evolution: '進化圖鑑',
    mute: '切換音效',
    overTitle: '宇宙打烊了！',
    overScore: s => `本局 <strong>${s}</strong> 分`,
    overNewRecord: p => `🏆 新紀錄！最高合成到「${p}」`,
    overNormal: (p, b) => `最高合成到「${p}」，最佳紀錄 ${b} 分`,
    restart: '再來一局',
    share: '📸 分享成績',
    shareDone: '✓ 已產生圖卡',
    daily: '每日挑戰',
    dailyBest: s => `今日最佳 ${s} 分`,
    leaderboard: '排行榜',
    noScores: '還沒有紀錄，快來創造第一筆！',
    revive: '💫 看廣告復活',
    swap: '換球（和下一顆交換）',
    hammer: '小錘子（敲掉一顆星球）',
    hammerHint: '🔨 點一顆星球敲掉它（再按一次取消）',
    adLoading: '模擬廣告',
    langButton: 'EN',
    tutorial: '👆 拖曳瞄準・放開投放<br>相同星球會合體升級！',
  },
  en: {
    docTitle: 'Cosmic Merge',
    title1: 'Cosmic ',
    title2: 'Merge',
    score: 'SCORE',
    best: 'BEST',
    next: 'NEXT',
    evolution: 'EVOLUTION',
    mute: 'Toggle sound',
    overTitle: 'The cosmos is full!',
    overScore: s => `You scored <strong>${s}</strong>`,
    overNewRecord: p => `🏆 New record! Highest merge: ${p}`,
    overNormal: (p, b) => `Highest merge: ${p} · Best: ${b}`,
    restart: 'Play Again',
    share: '📸 Share Score',
    shareDone: '✓ Card saved',
    daily: 'Daily Challenge',
    dailyBest: s => `Today's best: ${s}`,
    leaderboard: 'TOP SCORES',
    noScores: 'No scores yet — set the first record!',
    revive: '💫 Revive (Ad)',
    swap: 'Swap with next planet',
    hammer: 'Hammer (smash one planet)',
    hammerHint: '🔨 Tap a planet to smash it (tap again to cancel)',
    adLoading: 'Mock Ad',
    langButton: '中文',
    tutorial: '👆 Drag to aim · release to drop<br>Matching planets merge!',
  },
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh-TW' || saved === 'en') return saved
  } catch {
    /* 私密模式忽略 */
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

let lang: Lang = detectLang()
const listeners: Array<() => void> = []

export function getLang(): Lang {
  return lang
}

export function toggleLang(): Lang {
  lang = lang === 'zh-TW' ? 'en' : 'zh-TW'
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* 私密模式忽略 */
  }
  listeners.forEach(fn => fn())
  return lang
}

export function onLangChange(fn: () => void) {
  listeners.push(fn)
}

export function t(): Dict {
  return dicts[lang]
}

export function planetName(tier: number): string {
  const p = TIERS[tier]
  return lang === 'en' ? p.nameEn : p.name
}
