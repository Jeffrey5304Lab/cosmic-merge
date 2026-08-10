# iOS App Store 送審手冊（Cosmic Merge）

> 2026-08-09 建立。這份把「送審要準備的東西」一次備齊：可直接貼進 App Store Connect 的
> 文案、App Privacy / 年齡分級的答案、以及**只有你（開發者帳號持有人）能做**的步驟。
>
> ⚠️ 這版 **v1 有廣告**：復活／榔頭是 AdMob 獎勵廣告（`src/ads.ts` 的 `AdMobProvider`），
> 開場會跳 iOS 追蹤授權（ATT）。`docs/APP_PACKAGING.md` §6 說「v1 無廣告」已過時，以本檔為準。

---

## 0. 目前就緒狀態（我這邊已完成）

| 項目 | 狀態 |
|---|---|
| Bundle ID | `io.github.jeffrey5304lab.cosmicmerge`（送審後不可改） |
| 版本 / build | `MARKETING_VERSION = 1.0`、`CURRENT_PROJECT_VERSION = 1` |
| 方向 | 直向鎖定 |
| App 圖示 / 啟動畫面 | 已由 `assets/` 產生 |
| AdMob App ID | 已填入 `Info.plist` 的 `GADApplicationIdentifier`（`ca-app-pub-9224826741087415~3783216344`） |
| AdMob 正式 Rewarded 單元（iOS） | 已填 `src/config.ts` `REAL_REWARDED_IOS`；`build:release` 才啟用 |
| ATT 用途說明 | `Info.plist` `NSUserTrackingUsageDescription` 已填 |
| 出口加密宣告 | `Info.plist` `ITSAppUsesNonExemptEncryption = false`（免年度加密文件） |
| 隱私政策頁 | https://jeffrey5304lab.github.io/cosmic-merge/privacy.html（已更新揭露 AdMob + ATT） |
| App Store 截圖（6.9″） | `screenshots/appstore-6.9/` 兩張（gameplay + 結算/最佳紀錄），1320×2868 |

> ⚠️ `ios/` 在 `.gitignore`，不進版控。若 `ios/` 被刪除重建，`Info.plist` 的
> `GADApplicationIdentifier` / `NSUserTrackingUsageDescription` / `ITSAppUsesNonExemptEncryption`
> 要重新補（見上表值）。

---

## 1. 只有你能做（帳號 / GUI 步驟）

1. **Apple Developer Program**：https://developer.apple.com/programs/ 註冊並付 $99/年。
2. **Xcode 登入**：Xcode → Settings → Accounts 加入你的 Apple ID；在 App target 的
   Signing & Capabilities 選你的 Team、開 Automatically manage signing。
3. **App Store Connect 建立 App**：https://appstoreconnect.apple.com → My Apps → ＋ →
   New App。Platform=iOS、Name=`Cosmic Merge`、Primary Language=English、
   Bundle ID 選 `io.github.jeffrey5304lab.cosmicmerge`、SKU 隨意（如 `cosmicmerge01`）。
4. **打包上傳**：專案跑 `npm run cap:ios:release`（會用正式廣告 ID + 開 Xcode）→
   Xcode 選 **Any iOS Device (arm64)** → Product → Archive → Distribute App →
   App Store Connect → Upload。
5. **填 App Store Connect 資訊**：用下面第 2–4 節的內容。
6. **送審**：Add for Review → Submit。首次審核約 1–3 天。

---

## 2. 商店文案（可直接貼）

- **App 名稱（≤30 字）**：`Cosmic Merge: Planet Puzzle`
  （桌面顯示名仍是 `Cosmic Merge`；商店標題加關鍵字避免撞名 + 提升搜尋，2026-08-10 定案）
- **副標 Subtitle（≤30 字）**：`Drop planets, merge worlds`
- **分類**：Primary = **Games**；子分類 **Puzzle** + **Casual**
- **關鍵字（≤100 字，逗號分隔不留空白）**：
  `suika,watermelon,space,galaxy,drop,combo,star,relax,idle,physics,casual,ball,fruit`
  （刻意不含 merge/planet/puzzle/cosmic —— 那些已在標題/副標吃到更高權重，不重複才不浪費格子）
- **宣傳文字 Promotional Text（≤170 字，可隨時改不需審核）**：
  `Drop planets, merge matching worlds, and grow from a tiny meteor all the way to the Sun. Cozy hand-drawn art, chill lo-fi music, and a global leaderboard.`
- **Support URL**：`https://jeffrey5304lab.github.io/cosmic-merge/`
- **Marketing URL（選填）**：`https://jeffrey5304lab.github.io/cosmic-merge/`
- **Privacy Policy URL**：`https://jeffrey5304lab.github.io/cosmic-merge/privacy.html`
- **版權 Copyright**：`2026 Jieway Chou`（權利人本名；版權欄標示所有權人，不需與商店名一致，2026-08-10 定案）

### 描述 Description（≤4000 字）

```
Cosmic Merge is a cozy, hand-drawn take on the classic merge puzzle. Drop cute
planets into a storybook night sky — when two matching worlds touch, they fuse
into the next one up. Go from a tiny meteor to the Moon, Mars, Earth… all the way
to a blazing Sun.

Easy to learn, hard to put down. One thumb, endless "just one more drop."

FEATURES
• 11-step evolution chain, from Meteor to the Sun
• Hand-drawn "cozy paper" art — wobbly ink lines, watercolor nebulae, paper grain
• Chain COMBOs with juicy particles, shockwaves and screen shake
• Planets with feelings — they blink, smile when they merge, and sweat when the
  sky gets crowded
• Global leaderboard — submit your score and country, chase the world top 10
• Achievements, lifetime stats, and a shareable score card
• Generative lo-fi music, no audio files — pure vibes
• Plays offline, portrait, one-handed

Free to play. Optional rewarded ads let you revive a run or earn a hammer — never
forced, nothing locked behind them.
```

---

## 3. App Privacy 問卷（App Store Connect → App Privacy）

App 用了 **Google AdMob**（廣告）與 **Supabase**（排行榜）。建議這樣勾（AdMob 部分依 Google 官方
「Prepare for Apple's App Store data disclosure」指引；有更新以 Google 文件為準）：

**Data Used to Track You（因為有 ATT + IDFA）**
- **Identifiers → Device ID**
- **Usage Data → Advertising Data**（廣告互動）

**Data Linked / Not Linked**
| 資料類型 | 來源 | 目的 | Linked to identity? | Used for tracking? |
|---|---|---|---|---|
| Device ID | AdMob | Third-Party Advertising | No | **Yes** |
| Advertising Data | AdMob | Third-Party Advertising | No | **Yes** |
| Product Interaction（Usage Data） | AdMob | Third-Party Advertising / Analytics | No | No |
| Coarse Location（IP 推估，選填視設定） | AdMob | Third-Party Advertising | No | No |
| Crash / Performance / Diagnostics | AdMob SDK | App Functionality | No | No |
| User Content（自選暱稱） | Supabase 排行榜 | App Functionality | No | No |
| Gameplay Content（分數、國家、最高星球） | Supabase 排行榜 | App Functionality | No | No |

> 註：暱稱是「自選顯示名稱」非真實姓名，歸類 User Content；國家是清單自選，非 GPS/IP 定位。
> 我們沒有帳號系統，排行榜資料不與身分連結。

**送審時的 IDFA 宣告**：Advertising Identifier 使用 = **Yes** → 勾「Serve advertisements
within the app」；ATT 已實作，符合「only after obtaining permission」。

---

## 4. 年齡分級問卷（預期 4+）

所有暴力/成人/賭博/恐怖題目皆選 **None / No**：
- Cartoon or Fantasy Violence … **None**
- Realistic Violence / Sexual Content / Nudity / Profanity / Drugs / Alcohol / Horror … **None**
- Gambling … **No**
- Unrestricted Web Access … **No**
- Contests … **No**

→ 結果 **4+**。（獎勵廣告本身不改變分級；廣告內容由 AdMob 分級控管，可在 AdMob 後台把
廣告內容上限設為 G。）

---

## 5. 選配但建議：SKAdNetworkItems

我**沒有**手動把 50+ 組 SKAdNetwork ID 打進 `Info.plist`（易打錯，且 `ios/` 不進版控）。
這只影響廣告「歸因準確度」，不影響能不能顯示廣告或能不能送審。要補的話，直接複製 Google 官方
清單：https://developers.google.com/admob/ios/3p-skadnetworks 貼進 `ios/App/App/Info.plist`。

---

## 6. App Review Information（送審表單「App Review Information → Notes」直接貼）

> App Store Connect 送審頁最下方的 **Notes** 欄。寫清楚「不用登入、廣告是選配、ATT 何時跳」
> 能明顯降低被退件率。**Sign-In required = No**（本作沒有帳號系統）。

```
Cosmic Merge is a single-player, offline-friendly "merge" puzzle. No account or
login is required — you can play immediately.

REWARDED ADS (Google AdMob)
- Ads are entirely OPTIONAL and never block gameplay. Two spots only:
  1) "Continue Playing" on the game-over screen (revive), and
  2) the hammer tool when you are out of hammers.
- Both are clearly labeled "Watch a short ad …" and only play after a tap.
- Nothing in the game is locked behind watching an ad.

APP TRACKING TRANSPARENCY
- The ATT permission prompt is requested lazily — only the first time the
  player chooses to watch a rewarded ad — not at launch. Declining is fully
  supported; ads then serve non-personalized.

OPTIONAL LEADERBOARD
- On the game-over screen the player may optionally submit a self-chosen
  display name + a self-selected country (from a list, not GPS/IP) to a public
  leaderboard. It is optional and requires no account.

HOW TO REACH THE RESULTS / AD FLOW FOR REVIEW
- Drop planets by tapping; merge two matching planets to grow them. Let the
  stack reach the top dashed line to trigger the game-over card, where the
  "Continue Playing" rewarded-ad button appears.

Contact: jeffrey5304@gmail.com
```

- **Sign-In required**：**No**（無帳號系統，審核不需測試帳號）
- **Contact info**：填你的名字 + `jeffrey5304@gmail.com` + 電話（此聯絡資訊僅 Apple 審查人員可見，非公開）
  - 註：對外公開的隱私政策頁（public/privacy.html）仍顯示 `mngutoysports@gmail.com`，那是使用者/歐盟看的公開聯絡信箱，與此審查聯絡信箱可不同；如要一致需改 code 再重新部署。

---

## 7. 送審前快速檢查

- [ ] Apple Developer 帳號已生效、Xcode 已選 Team
- [ ] App Store Connect 已建 App（Bundle ID 對上）
- [ ] `npm run cap:ios:release` → Archive → Upload 成功、TestFlight 能跑
- [ ] 貼上第 2 節文案、第 3 節隱私、第 4 節分級、第 6 節 Review notes
- [ ] 上傳 `screenshots/appstore-6.9/`（6.9″ 必填；6.5″ 可留白，Apple 會自動縮放沿用）
- [ ] 商店搜「Cosmic Merge」確認無撞名 / 商標問題
- [ ] Submit for Review
