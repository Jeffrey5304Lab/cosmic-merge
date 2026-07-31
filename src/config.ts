/** Supabase project config (public anon key — safe to ship to the client). */
export const SUPABASE_URL = 'https://ajbzzhcqpxyylnzgailx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYnp6aGNxcHh5eWxuemdhaWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTE2MjQsImV4cCI6MjA5Nzk2NzYyNH0.dkyTCjQclakiRO6Q-kIRni-V0NAESmU7pBNon8Zh9P8'

/** True once SUPABASE_URL/SUPABASE_ANON_KEY are filled in. */
export const REMOTE_ENABLED = (SUPABASE_URL as string) !== '' && (SUPABASE_ANON_KEY as string) !== ''

/**
 * 是否使用「正式」AdMob 廣告（會計入真實收益、點到會被 AdMob 稽核）。
 *
 * 只有明確的正式發佈打包才會是 true —— 見 package.json 的 `build:release`
 * （它用 `vite build --mode release`，載入 .env.release 裡的 VITE_ADMOB_LIVE=1）。
 *
 * 其餘情境一律 false → 走 Google 官方「測試廣告」：
 *   - `npm run dev`（開發伺服器）
 *   - `npm run build` / GitHub Pages 部署（web 版本來就沒有原生廣告）
 *   - `npm run cap:ios`（在 Xcode 本機/模擬器測試的 iOS build）
 * 這樣你開發、測試時就算點到廣告，也不會被 AdMob 判定為無效流量而封號。
 */
export const ADMOB_LIVE = import.meta.env.VITE_ADMOB_LIVE === '1'

/**
 * AdMob 獎勵廣告單元 ID —— 自動切換測試／正式（見上面 ADMOB_LIVE）。
 *
 * - 非正式發佈：永遠回傳 Google 官方公開測試 ID（一定有廣告、點了也安全、無收益）。
 * - 正式發佈（build:release）：回傳下面的 REAL_* 正式 ID；若正式 ID 還沒填（空字串），
 *   會自動退回測試 ID 並在 console 警告，所以「還沒申請到 ID」也能正常 build。
 *
 * 📋 上架前要做的事：
 * 1. 在 https://apps.admob.com 建 App（iOS）＋ Rewarded 廣告單元，拿到：
 *    - App ID（`ca-app-pub-xxxx~yyyy`，波浪號 ~）
 *    - Rewarded 廣告單元 ID（`ca-app-pub-xxxx/zzzz`，斜線 /）
 * 2. 把 Rewarded 廣告單元 ID 填進下面的 REAL_REWARDED_*。
 * 3. 把 App ID 填進 ios/App/App/Info.plist 的 GADApplicationIdentifier
 *    （ios/ 沒進 git，要在這台 Mac 手動改）。
 */
// Google 官方公開測試 ID（https://developers.google.com/admob/ios/test-ads）
const TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313'
const TEST_REWARDED_ANDROID = 'ca-app-pub-3940256099942544/5224354917'

// ⬇️ 上架前換成你自己的正式 Rewarded 廣告單元 ID（留空＝還沒申請，會自動用測試 ID）
const REAL_REWARDED_IOS = ''
const REAL_REWARDED_ANDROID = ''

/** 正式發佈且已填正式 ID → 用正式 ID；否則一律用安全的測試 ID */
function pickAdUnit(real: string, test: string, label: string): string {
  if (ADMOB_LIVE) {
    if (real) return real
    console.warn(`[ads] ${label} 尚未填入正式 AdMob ID，正式版暫時使用測試廣告（無收益）。`)
  }
  return test
}

export const ADMOB_REWARDED_AD_UNIT_ID_IOS = pickAdUnit(REAL_REWARDED_IOS, TEST_REWARDED_IOS, 'iOS Rewarded')
export const ADMOB_REWARDED_AD_UNIT_ID_ANDROID = pickAdUnit(REAL_REWARDED_ANDROID, TEST_REWARDED_ANDROID, 'Android Rewarded')
