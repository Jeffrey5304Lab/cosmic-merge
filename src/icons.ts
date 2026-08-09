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
