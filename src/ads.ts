/**
 * 廣告抽象層：所有盈利點都走這個介面。
 * 正式上線時把 MockAdProvider 換成 AdMob（App）或 H5 Games Ads（Web）的實作即可，
 * 遊戲端程式碼完全不用動。
 */
export type AdSlot = 'revive' | 'hammer'

export interface AdProvider {
  readonly name: string
  /** 顯示獎勵式廣告；玩家完整看完回傳 true */
  showRewarded(slot: AdSlot): Promise<boolean>
}

/** 佔位實作：播 3 秒模擬廣告畫面，驗證流程與 UI 動線 */
class MockAdProvider implements AdProvider {
  readonly name = 'mock'

  showRewarded(slot: AdSlot): Promise<boolean> {
    return new Promise(resolve => {
      const overlay = document.createElement('div')
      overlay.className = 'ad-mock'
      overlay.innerHTML = `
        <div class="ad-mock-box">
          <span class="ad-mock-tag">AD</span>
          <p class="ad-mock-title">🎬</p>
          <p class="ad-mock-count">3</p>
          <p class="ad-mock-slot">${slot}</p>
        </div>`
      document.body.appendChild(overlay)
      const countEl = overlay.querySelector<HTMLParagraphElement>('.ad-mock-count')
      let n = 3
      const timer = setInterval(() => {
        n--
        if (countEl) countEl.textContent = String(n)
        if (n <= 0) {
          clearInterval(timer)
          overlay.remove()
          resolve(true)
        }
      }, 1000)
    })
  }
}

export const ads: AdProvider = new MockAdProvider()
