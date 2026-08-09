/**
 * 手繪風 inline SVG 圖示（viewBox 0 0 24 24），取代結算卡上的 emoji，
 * 與工具列 / 成就面板（achievements.ts 的 I.*）同一套 ink 描邊 + honey/coral 語彙。
 *
 * 用法：塞進 element.innerHTML（皆為靜態字串，無使用者輸入，無 XSS 疑慮）。
 * 描邊多用 currentColor，讓圖示自動吃按鈕的文字色（珊瑚鈕上白、蜂蜜鈕上墨）。
 */

/** 播放三角形（Continue Playing） */
export const ICON_PLAY =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M7 4.6 19 12 7 19.4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'

/** 相機（Share Score） */
export const ICON_CAMERA =
  '<svg viewBox="0 0 24 24" class="ic"><rect x="3" y="7.2" width="18" height="11.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.4 7.2 9.7 5h4.6l1.3 2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.1" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>'

/** 獎盃（Submit to Leaderboard） */
export const ICON_TROPHY =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M7 4h10v3.2a5 5 0 0 1-10 0z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 5.2H4.6v1.4A2.6 2.6 0 0 0 7 9.2M17 5.2h2.4v1.4A2.6 2.6 0 0 1 17 9.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 12.2v2.8M9.2 19h5.6M10.2 19l.4-4h2.8l.4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'

/** 打勾（Submitted! / Card saved） */
export const ICON_CHECK =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M5 12.5 9.6 17 19 6.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/** 榔頭（錘子提示、每日獎勵） */
export const ICON_HAMMER =
  '<svg viewBox="0 0 24 24" class="ic"><rect x="5" y="3.4" width="12" height="6.2" rx="2" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4"/><path d="M10.4 9.6c-.1 3.3 0 6.7.3 10 .05.7 1.2.7 1.25 0 .3-3.3.35-6.7.25-10z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/></svg>'

/** 火焰（連續登入 streak） */
export const ICON_FLAME =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3 2.2-4 .4 1 .8 1.6 1.6 2 .2-3 0-5.6-.8-8z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.2" stroke-linejoin="round"/></svg>'

/** 星星（發現新恆星橫幅） */
export const ICON_STAR =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M12 2.5l2.3 5.4 5.7.5-4.3 3.8 1.3 5.6L12 20.4 6.9 22.8l1.3-5.6-4.3-3.8 5.7-.5z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.2" stroke-linejoin="round"/></svg>'

/** 亮片（續玩成功 / 里程碑） */
export const ICON_SPARKLE =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M9 3l1.4 3.6L14 8l-3.6 1.4L9 13l-1.4-3.6L4 8l3.6-1.4z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1" stroke-linejoin="round"/><path d="M16.5 12l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="var(--honey)" stroke="var(--ink)" stroke-width="0.9" stroke-linejoin="round"/></svg>'

/** 皇冠（世界第一 / 榜首） */
export const ICON_CROWN =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M3.5 7.5l3.8 3 4.7-6 4.7 6 3.8-3-1.8 11H5.3z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/></svg>'

/** 地球（全球名次） */
export const ICON_GLOBE =
  '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="8.6" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4"/><path d="M3.6 12h16.8M12 3.4c2.4 2.3 2.4 14.9 0 17.2M12 3.4c-2.4 2.3-2.4 14.9 0 17.2M5 6.6c4 2.1 10 2.1 14 0M5 17.4c4-2.1 10-2.1 14 0" fill="none" stroke="var(--ink)" stroke-width="1.1"/></svg>'

/** 黑洞（合成雙太陽的目標橫幅） */
export const ICON_BLACKHOLE =
  '<svg viewBox="0 0 24 24" class="ic"><ellipse cx="12" cy="12" rx="10" ry="4.4" fill="none" stroke="var(--honey)" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="var(--ink)"/></svg>'

/** 觸控（新手教學：拖曳瞄準） */
export const ICON_HAND =
  '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="13" r="3.2" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.3"/><path d="M6.5 7.5a7 7 0 0 0 0 5M17.5 7.5a7 7 0 0 1 0 5" fill="none" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round"/></svg>'

/** 離線（本機排行榜標題） */
export const ICON_OFFLINE =
  '<svg viewBox="0 0 24 24" class="ic"><path d="M4 9.5a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M9.8 16.3a3.3 3.3 0 0 1 4.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="19.6" r="1.1" fill="currentColor"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'

/** 禮物盒（每日獎勵彈窗） */
export const ICON_GIFT =
  '<svg viewBox="0 0 24 24" class="ic"><rect x="4" y="10" width="16" height="10" rx="1.5" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4"/><path d="M3 7.5h18v3H3z" fill="var(--honey)" stroke="var(--ink)" stroke-width="1.4"/><path d="M12 7.5V20" fill="none" stroke="var(--ink)" stroke-width="1.4"/><path d="M12 7.5C10 7.5 8 6.6 8 5.1A1.6 1.6 0 0 1 11 4.5c.6 1 1 2 1 3zM12 7.5c2 0 4-.9 4-2.4A1.6 1.6 0 0 0 13 4.5c-.6 1-1 2-1 3z" fill="var(--accent)" stroke="var(--ink)" stroke-width="1.2" stroke-linejoin="round"/></svg>'

/** 名次獎牌：緞帶 + 圓牌 + 名次數字（1/2/3 各給金/銀/銅） */
const DISC = ['#F3CB57', '#D9DEE5', '#DB9257'] // gold / silver / bronze
export function medalSvg(rank: number): string {
  const disc = DISC[rank - 1] ?? DISC[2]
  return (
    `<svg viewBox="0 0 24 24" class="ic ic-medal" aria-hidden="true">` +
    `<path d="M8.6 2.5 6.6 9.4M15.4 2.5 17.4 9.4" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>` +
    `<circle cx="12" cy="15" r="6.3" fill="${disc}" stroke="var(--ink)" stroke-width="1.5"/>` +
    `<text x="12" y="15.3" text-anchor="middle" dominant-baseline="central" font-size="8" ` +
    `style="font-family:var(--font-display);font-weight:700" fill="var(--ink)">${rank}</text>` +
    `</svg>`
  )
}
