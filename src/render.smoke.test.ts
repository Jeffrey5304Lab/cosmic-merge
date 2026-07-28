import { describe, expect, it } from 'vitest'
import { TIERS } from './planets'
import { BH_PHASE, drawBlackHole, drawPlanet, drawSupernovaFlash, makeStars } from './render'

/**
 * 煙霧測試：一般單元測試不會真的跑 canvas 繪製路徑（無頭環境沒有 document/canvas），
 * 所以 render.ts 裡的光冕、黑洞噴流等程式其實從沒被執行過——一個拼字錯誤只會在瀏覽器才炸。
 * 這裡用一個假的 2D context（所有方法都 no-op、gradient 回傳假物件）把每顆星球與黑洞各階段
 * 都畫一遍，確保繪製路徑不會擲例外（抓 undefined method / 型別錯誤）。
 */
function fakeCtx(): CanvasRenderingContext2D {
  const grad = { addColorStop() {} }
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad
      if (prop === 'createPattern') return () => ({})
      if (prop === 'canvas') return { width: 460, height: 660 }
      return () => undefined
    },
    set() {
      return true
    },
  }
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D
}

describe('render 煙霧測試（繪製路徑不擲例外）', () => {
  it('每一階星球都能畫（含各恆星光冕樣式）', () => {
    const g = fakeCtx()
    for (const tier of TIERS) {
      expect(() => drawPlanet(g, tier, 200, 300, 0.3, 1, 1.7)).not.toThrow()
      // 誕生喜悅臉 + 危機臉 + 打哈欠等分支也各跑一次
      expect(() => drawPlanet(g, tier, 200, 300, 0, 1, 1.7, tier.tier + 1, 0.1, 0.8, 0.5, 0.5)).not.toThrow()
    }
  })

  it('黑洞過場三階段（form / devour / finale）都能畫', () => {
    const g = fakeCtx()
    const stars = makeStars(20)
    for (const t of [0.1, BH_PHASE.form + 0.1, BH_PHASE.devourEnd + 0.1, BH_PHASE.total]) {
      expect(() => drawBlackHole(g, 230, 330, t, 2.5, stars)).not.toThrow()
      expect(() => drawSupernovaFlash(g, 230, 330, t)).not.toThrow()
    }
  })
})
