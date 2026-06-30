import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * 觸覺回饋：
 * - 原生 App（含 iOS WKWebView，navigator.vibrate 不支援）→ Capacitor Haptics
 * - Web / Android 瀏覽器 → navigator.vibrate
 * - node / 測試環境 → 直接略過
 */
export function buzz(ms: number) {
  if (typeof window === 'undefined') return
  try {
    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({ style: ms >= 20 ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
      return
    }
  } catch {
    /* 取得平台失敗就退回 vibrate */
  }
  if ('vibrate' in navigator) navigator.vibrate(ms)
}
