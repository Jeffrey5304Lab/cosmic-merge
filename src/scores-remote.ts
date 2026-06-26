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

/**
 * Look up where `score` would rank globally and the gap to the player above.
 * rank = (# of scores strictly greater) + 1; gap = nextHigherScore - score
 * (null when already #1). Returns null if remote disabled or on failure.
 */
export async function fetchRank(score: number): Promise<{ rank: number; gap: number | null } | null> {
  if (!REMOTE_ENABLED) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=score&score=gt.${score}&order=score.asc&limit=1`,
      { headers: { ...headers(), Prefer: 'count=exact' } },
    )
    if (!res.ok) return null
    // Content-Range: "0-0/41"（有上面的人）或 "*/0"（你最高）
    const total = Number(res.headers.get('content-range')?.split('/')[1])
    const rank = Number.isFinite(total) ? total + 1 : 1
    const rows: unknown = await res.json()
    const next = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    const gap =
      next && typeof (next as Record<string, unknown>).score === 'number'
        ? (next as { score: number }).score - score
        : null
    return { rank, gap }
  } catch {
    return null
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
