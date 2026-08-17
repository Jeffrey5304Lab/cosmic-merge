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

---

## 8. 被退件回覆：Guideline 2.1 – Information Needed（2026-08-14）

> 首次送審後收到 **Guideline 2.1 - Information Needed - New App Submission**。
> 這 **不是** 「App 有問題」的退件，而是審核員要更多資訊才能繼續。**不需重新打包**，
> 只要在 **App Store Connect → 回覆 App 審查** 用文字回答 7 題 + **附一段實機錄影**，
> 並把同一段文字貼進 **App Review Information → Notes** 供之後版本用。

**唯一要動手的事：用實體 iPhone 錄一段畫面影片（第 1 題）。** 錄約 60–90 秒：
1. 從主畫面圖示啟動 App。
2. 丟幾顆星球、展示兩顆合併。
3. 點榔頭 → 沒榔頭時再點一次 → 出現「看廣告」提示 → 播獎勵廣告 →**這裡會跳 ATT 追蹤授權視窗**（必須錄到）。
4. 遊戲結束 → 展示「Continue Playing」看廣告復活按鈕。
5. 結算卡展示排行榜提交（暱稱 + 國家選單）。
用 iOS 內建「螢幕錄影」錄，從回覆視窗 → 附加檔案上傳。無內購/訂閱、無登入，那些不用錄。

**送出前**：第 2 題填上 iPhone 13 的 iOS 版本（設定→一般→關於本機→軟體版本）。
排行榜暱稱屬輕度 UGC（Guideline 1.2），這次沒被挑，**不主動提**，被問再答。

### 可直接貼上的回覆（回覆審查 + Notes 兩處都貼）

```
Thank you for the review. Cosmic Merge is a single-player, offline-friendly
"merge" puzzle game. Answers to each point below; a screen recording captured
on a physical iPhone (running the latest iOS) is attached.

1. SCREEN RECORDING (attached)
Captured on a physical iPhone. It begins at app launch and shows the core loop:
dropping planets, merging matching planets, using the hammer tool (including the
"watch a short ad" rewarded-ad prompt), reaching the game-over screen with the
optional "Continue Playing" rewarded-ad revive, and the optional leaderboard
submission (self-chosen nickname + country). The App Tracking Transparency
prompt is shown the first time the player chooses to watch a rewarded ad.

2. DEVICES / OS TESTED BEFORE SUBMISSION
- iPhone 13 (physical device) — iOS 26.3
- iPhone 16 Pro (Simulator) — iOS 26

3. WHAT THE APP DOES / TARGET AUDIENCE
Cosmic Merge is a casual, one-handed "merge" puzzle. The player drops cute
hand-drawn planets into a night sky; when two matching planets touch they fuse
into the next one up, chaining from a tiny meteor all the way to the Sun. It is
a relaxing pick-up-and-play score-chaser aimed at a general casual-puzzle
audience (rated 4+). No account, no login, playable offline.

4. SETUP / HOW TO ACCESS MAIN FEATURES
No setup or credentials required — the game is fully playable immediately on
launch with no account or sign-in. Tap to drop a planet; merge matching planets
to grow them. To reach the ad/revive flow, let the stack reach the top dashed
line to trigger the game-over card, where the "Continue Playing" rewarded-ad
button appears. To reach the hammer ad flow, tap the hammer tool when out of
hammers. No demo account or sample files are needed.

5. EXTERNAL SERVICES USED
- Google AdMob — serves optional rewarded video ads (revive / hammer only).
- Supabase — hosts the optional public high-score leaderboard.
There are no other third-party data providers, authentication services, payment
processors, or AI services. There are no in-app purchases or subscriptions.

6. REGIONAL DIFFERENCES
None. The app functions identically across all regions. There is no
region-locked or region-specific content.

7. REGULATED INDUSTRY / PROTECTED THIRD-PARTY MATERIAL
Not applicable. The app is not in a regulated industry. All artwork and the
generative music are original to the developer; no protected third-party
material is used.

ADDITIONAL NOTES
- Rewarded ads (Google AdMob) are entirely optional and never block gameplay.
  They appear only after a tap, in two clearly-labeled spots ("Continue Playing"
  revive on game-over, and the hammer tool when empty). Nothing is locked behind
  watching an ad.
- App Tracking Transparency is requested lazily — only the first time the player
  chooses to watch a rewarded ad, not at launch. Declining is fully supported;
  ads then serve non-personalized.
- The optional leaderboard only stores a self-chosen display name (not a real
  name) and a self-selected country from a list (not GPS/IP location). No account
  is required and the data is not linked to identity.

Contact: jeffrey5304@gmail.com
```

### 如何把遊戲裝上實體 iPhone 來錄影（用 Xcode + 傳輸線，最快、廣告安全）

> 用「一般 build」而非 release：它跑 Google **測試廣告**（畫面會標 "Test Ad"），
> 你可以放心一直點來錄影，**不會被 AdMob 判無效流量**。release build 用的是真實廣告
> 單元，自己反覆點會有無效流量風險 —— 所以錄影用一般 build。審核看的是「廣告流程」，
> 測試廣告完全 OK。

1. iPhone 13 用傳輸線接上這台 Mac，手機出現「信任這台電腦」按信任。
2. （iOS 16+）在 iPhone 開開發者模式：設定 → 隱私權與安全性 → 開發者模式 → 開啟 → 重開機。
3. 專案根目錄跑：`npm run build && npx cap sync ios && npx cap open ios`（Xcode 會開啟 workspace）。
4. Xcode 上方裝置選單選你的 **iPhone 13**（不是模擬器）；Signing & Capabilities 的 Team = **JIEWAY CHOU**、開 Automatically manage signing（本機已設好）。
5. 按 ▶ Run。App 會裝進手機並自動啟動。
6. 首次執行手機會擋開發者憑證：設定 → 一般 → VPN 與裝置管理 → 點你的開發者帳號 → 信任。再從主畫面點圖示打開。
7. 從控制中心開「螢幕錄影」，照上面 5 步流程錄，錄完影片存到「照片」。
8. 把影片傳到 Mac（AirDrop 最快），上傳到 App Store Connect 的回覆視窗。

> 備選：也可用 **TestFlight** 裝已上傳的 build 2（App Store Connect → TestFlight → 加自己為
> Internal Tester → 手機用 TestFlight App 安裝）。它是「審核看到的那個 release build」，最貼近，
> 但用真實廣告單元，自己點廣告有無效流量風險 —— 想用 TestFlight 錄就只點過一次示意即可。
