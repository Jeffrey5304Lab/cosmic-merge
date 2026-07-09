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
  overScore: (s: number) => `You scored <strong>${s.toLocaleString('en-US')}</strong>`,
  overNewRecord: (p: string) => `🏆 New record! Highest merge: ${p}`,
  overNormal: (p: string, b: number) => `Highest merge: ${p} · Best: ${b}`,
  restart: 'Play Again',
  submitScore: '🏅 Submit to Leaderboard',
  submitScoreDone: '✅ Submitted!',
  share: '📸 Share Score',
  shareDone: '✓ Card saved',
  leaderboard: 'TOP SCORES',
  globalLeaderboard: 'GLOBAL TOP SCORES',
  offlineLeaderboard: '📴 OFFLINE · YOUR SCORES',
  noScores: 'No scores yet — set the first record!',
  rankGlobal: (rank: number) => `🌍 Global rank #${rank}`,
  rankLocal: (rank: number) => `Your rank #${rank}`,
  rankGap: (gap: number) => `just ${gap.toLocaleString('en-US')} more to pass the one above! 🔥`,
  rankTop: "👑 You're #1 in the world!",
  rankTopLocal: '👑 Top of your board!',
  namePlaceholder: 'Your name',
  revive: '💫 Revive',
  hammer: 'Hammer (smash one planet)',
  hammerHint: '🔨 Tap a planet to smash it (tap empty space to cancel)',
  tutorial: '👆 Drag to aim · release to drop<br>Matching planets merge!',
}

export function planetName(tier: number): string {
  return TIERS[tier].name
}
