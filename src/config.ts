/** Supabase project config (public anon key — safe to ship to the client). */
export const SUPABASE_URL = 'https://ajbzzhcqpxyylnzgailx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp6aGNxcHh5eWxuemdhaWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTE2MjQsImV4cCI6MjA5Nzk2NzYyNH0.dkyTCjQclakiRO6Q-kIRni-V0NAESmU7pBNon8Zh9P8'

/** True once SUPABASE_URL/SUPABASE_ANON_KEY are filled in. */
export const REMOTE_ENABLED = (SUPABASE_URL as string) !== '' && (SUPABASE_ANON_KEY as string) !== ''

/**
 * AdMob 獎勵廣告單元 ID。目前填的是 Google 官方公開的「測試用」ID
 * （https://developers.google.com/admob/ios/test-ads），可以直接編譯、一定看得到廣告，
 * 但不會有真實收益、也不能拿來送審。
 *
 * ⚠️ 上架前必須換成自己在 AdMob 後台申請的正式 ID：
 * 1. 在 https://apps.admob.com 建立 App（iOS）＋一個 Rewarded 廣告單元
 * 2. 把這裡的值換成你的 Rewarded 廣告單元 ID
 * 3. 把 App ID 填進 ios/App/App/Info.plist 的 GADApplicationIdentifier（ios/ 沒進 git，要手動改）
 */
export const ADMOB_REWARDED_AD_UNIT_ID_IOS = 'ca-app-pub-3940256099942544/1712485313'
export const ADMOB_REWARDED_AD_UNIT_ID_ANDROID = 'ca-app-pub-3940256099942544/5224354917'
