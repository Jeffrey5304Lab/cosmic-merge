import { REMOTE_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

export interface RemoteScoreEntry {
  name: string
  score: number
  maxTier: number
}

function headers(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}

/** Submit a score to the global leaderboard. Returns true on success. */
export async function submitScore(name: string, score: number, maxTier: number): Promise<boolean> {
  if (!REMOTE_ENABLED) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ name, score, max_tier: maxTier }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Fetch the top global scores, highest first. Returns [] on failure. */
export async function fetchTopScores(limit = 10): Promise<RemoteScoreEntry[]> {
  if (!REMOTE_ENABLED) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=name,score,max_tier&order=score.desc&limit=${limit}`,
      { headers: headers() },
    )
    if (!res.ok) return []
    const rows: unknown = await res.json()
    if (!Array.isArray(rows)) return []
    return rows
      .filter(
        (r): r is { name: string; score: number; max_tier: number } =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as Record<string, unknown>).name === 'string' &&
          typeof (r as Record<string, unknown>).score === 'number' &&
          typeof (r as Record<string, unknown>).max_tier === 'number',
      )
      .map(r => ({ name: r.name, score: r.score, maxTier: r.max_tier }))
  } catch {
    return []
  }
}
