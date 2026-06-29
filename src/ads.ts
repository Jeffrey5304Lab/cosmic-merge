/**
 * 廣告／獎勵抽象層：所有「看廣告換獎勵」的點都走這個介面。
 *
 * v1 不接廣告 → 用 DirectGrantProvider「直接授予」，不顯示任何（假）廣告。
 * 要變現時把 export 換成 AdMob（App）或 H5 Games Ads（Web）的實作即可，
 * 遊戲端（main.ts 的 revive / hammer 流程）完全不用動。
 */
export type AdSlot = 'revive' | 'hammer'

export interface AdProvider {
  readonly name: string
  /** 兌現獎勵；可兌現回傳 true（接真實廣告後＝玩家完整看完才 true） */
  showRewarded(slot: AdSlot): Promise<boolean>
}

/** v1：直接授予獎勵，不顯示廣告 */
class DirectGrantProvider implements AdProvider {
  readonly name = 'direct'
  showRewarded(_slot: AdSlot): Promise<boolean> {
    return Promise.resolve(true)
  }
}

export const ads: AdProvider = new DirectGrantProvider()
