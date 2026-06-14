/** English UI strings (single-language build). */
import { TIERS } from './planets'

export const STR = {
  docTitle: 'Cosmic Merge',
  title1: 'Cosmic ',
  title2: 'Merge',
  score: 'SCORE',
  best: 'BEST',
  next: 'NEXT',
  bestMerge: 'TOP MERGE',
  evolution: 'EVOLUTION',
  mute: 'Toggle sound',
  overTitle: 'The cosmos is full!',
  overScore: (s: number) => `You scored <strong>${s}</strong>`,
  overNewRecord: (p: string) => `🏆 New record! Highest merge: ${p}`,
  overNormal: (p: string, b: number) => `Highest merge: ${p} · Best: ${b}`,
  restart: 'Play Again',
  share: '📸 Share Score',
  shareDone: '✓ Card saved',
  leaderboard: 'TOP SCORES',
  globalLeaderboard: 'GLOBAL TOP SCORES',
  noScores: 'No scores yet — set the first record!',
  namePlaceholder: 'Your name',
  revive: '💫 Revive (Ad)',
  hammer: 'Hammer (smash one planet)',
  hammerHint: '🔨 Tap a planet to smash it (tap again to cancel)',
  tutorial: '👆 Drag to aim · release to drop<br>Matching planets merge!',
}

export function planetName(tier: number): string {
  return TIERS[tier].name
}
