/**
 * 廣告／獎勵抽象層：所有「看廣告換獎勵」的點都走這個介面。
 *
 * 原生 App（iOS/Android，透過 Capacitor）走真的 AdMob 獎勵廣告；
 * Web 版（GitHub Pages）沒有原生廣告 SDK 可用，維持 DirectGrantProvider
 * 直接授予（之後要接 H5 Games Ads 再換掉）。
 * 遊戲端（main.ts 的 revive / hammer 流程）完全不用管是哪一種實作。
 */
import { Capacitor } from '@capacitor/core'
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import { ADMOB_LIVE, ADMOB_REWARDED_AD_UNIT_ID_ANDROID, ADMOB_REWARDED_AD_UNIT_ID_IOS } from './config'

export type AdSlot = 'revive' | 'hammer'

export interface AdProvider {
  readonly name: string
  /** 兌現獎勵；可兌現回傳 true（接真實廣告後＝玩家完整看完才 true） */
  showRewarded(slot: AdSlot): Promise<boolean>
  /** 選用：App 啟動時預熱（初始化 SDK／跳 iOS 追蹤授權），讓玩家第一次點按時廣告已經準備好 */
  warmup?(): Promise<void>
}

/** Web 版／找不到廣告 SDK 時的退路：直接授予獎勵，不顯示廣告 */
class DirectGrantProvider implements AdProvider {
  readonly name = 'direct'
  showRewarded(_slot: AdSlot): Promise<boolean> {
    return Promise.resolve(true)
  }
}

/** 原生 App：真的 AdMob Rewarded 廣告。一支影片看完＝一次 revive 或補一支榔頭 */
class AdMobProvider implements AdProvider {
  readonly name = 'admob'
  private initDone: Promise<void> | null = null

  private adUnitId(): string {
    return Capacitor.getPlatform() === 'android' ? ADMOB_REWARDED_AD_UNIT_ID_ANDROID : ADMOB_REWARDED_AD_UNIT_ID_IOS
  }

  private ensureInit(): Promise<void> {
    if (!this.initDone) {
      // 非正式發佈時標記為測試流量，避免開發／測試機誤觸真實廣告計費（與廣告單元 ID 的切換一致）
      this.initDone = AdMob.initialize({ initializeForTesting: !ADMOB_LIVE }).then(() => undefined)
    }
    return this.initDone
  }

  /** App 啟動時預熱：先跳 iOS 14.5+ 的追蹤授權，SDK 也先初始化好，第一次看廣告才不會多等 */
  async warmup(): Promise<void> {
    try {
      await this.ensureInit()
      await AdMob.requestTrackingAuthorization()
    } catch {
      // 使用者拒絕追蹤或平台不支援：忽略，AdMob 會自動退回非個人化廣告
    }
  }

  async showRewarded(_slot: AdSlot): Promise<boolean> {
    try {
      await this.ensureInit()
      let earned = false
      // 一定要在 show 之前掛 listener：獎勵是用事件回報，showRewardVideoAd() 的
      // resolve 只代表「廣告流程跑完」（看到一半關掉也會 resolve），不能單獨拿來判斷。
      const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earned = true
      })
      try {
        await AdMob.prepareRewardVideoAd({ adId: this.adUnitId() })
        await AdMob.showRewardVideoAd()
      } finally {
        await rewardListener.remove()
      }
      return earned
    } catch {
      // 廣告載入失敗（斷網、無庫存等）：當作「沒看完」處理，不中斷遊戲流程
      return false
    }
  }
}

export const ads: AdProvider = Capacitor.isNativePlatform() ? new AdMobProvider() : new DirectGrantProvider()
