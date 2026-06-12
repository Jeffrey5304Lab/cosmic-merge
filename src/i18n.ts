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
  /** 語言切換鈕顯示「切過去的語言」 */
  langButton: string
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
    langButton: 'EN',
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
    langButton: '中文',
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
