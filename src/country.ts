/** 國家工具：ISO 3166-1 alpha-2 國碼 ↔ 國旗 emoji、在地化國名、瀏覽器語系推測 */

/** 國碼 → 國旗 emoji（兩個 regional indicator 字母組合）。非法輸入回空字串。 */
export function flagEmoji(cc?: string): string {
  if (!cc) return ''
  const cu = cc.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cu)) return ''
  return String.fromCodePoint(0x1f1e6 + cu.charCodeAt(0) - 65, 0x1f1e6 + cu.charCodeAt(1) - 65)
}

/** 涵蓋絕大多數國家的 ISO alpha-2 清單（下拉選單用） */
export const COUNTRY_CODES =
  'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS YE ZA ZM ZW'.split(
    ' ',
  )

/** code → 在地化國名（用 Intl.DisplayNames，不支援時回傳 code 本身） */
export function countryName(cc: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc.toUpperCase()) ?? cc
  } catch {
    return cc
  }
}

/** 用瀏覽器語系猜測玩家國家，例如 zh-TW → TW；猜不到回空字串 */
export function guessCountry(): string {
  const langs = [navigator.language, ...(navigator.languages ?? [])]
  for (const l of langs) {
    if (!l) continue
    try {
      const region = new Intl.Locale(l).maximize().region
      if (region) return region.toUpperCase()
    } catch {
      /* 退回字串解析 */
    }
    const m = /[-_]([A-Za-z]{2})\b/.exec(l)
    if (m) return m[1].toUpperCase()
  }
  return ''
}
