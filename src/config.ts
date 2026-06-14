/** Supabase project config (public anon key — safe to ship to the client). */
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

/** True once SUPABASE_URL/SUPABASE_ANON_KEY are filled in. */
export const REMOTE_ENABLED = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''
