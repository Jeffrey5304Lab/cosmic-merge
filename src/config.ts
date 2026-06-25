/** Supabase project config (public anon key — safe to ship to the client). */
export const SUPABASE_URL = 'https://ajbzzhcqpxyylnzgailx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp6aGNxcHh5eWxuemdhaWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTE2MjQsImV4cCI6MjA5Nzk2NzYyNH0.dkyTCjQclakiRO6Q-kIRni-V0NAESmU7pBNon8Zh9P8'

/** True once SUPABASE_URL/SUPABASE_ANON_KEY are filled in. */
export const REMOTE_ENABLED = (SUPABASE_URL as string) !== '' && (SUPABASE_ANON_KEY as string) !== ''
