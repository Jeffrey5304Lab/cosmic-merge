import { describe, expect, it } from 'vitest'
import { COUNTRY_CODES, countryName, flagEmoji } from './country'

describe('country（國旗 / 國名）', () => {
  it('flagEmoji 把國碼轉成 regional indicator 國旗', () => {
    expect(flagEmoji('TW')).toBe('🇹🇼')
    expect(flagEmoji('JP')).toBe('🇯🇵')
  })

  it('flagEmoji 不分大小寫', () => {
    expect(flagEmoji('us')).toBe(flagEmoji('US'))
  })

  it('flagEmoji 對非法輸入回空字串', () => {
    expect(flagEmoji('')).toBe('')
    expect(flagEmoji(undefined)).toBe('')
    expect(flagEmoji('X')).toBe('')
    expect(flagEmoji('USA')).toBe('')
    expect(flagEmoji('12')).toBe('')
  })

  it('countryName 用 Intl 轉在地化國名', () => {
    expect(countryName('TW')).toBe('Taiwan')
    expect(countryName('JP')).toBe('Japan')
  })

  it('國碼清單無重複且皆為兩碼大寫', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
    expect(COUNTRY_CODES.every(c => /^[A-Z]{2}$/.test(c))).toBe(true)
  })
})
