# iOS App Store 送審手冊（Novaborn，原 Cosmic Merge）

> 2026-08-09 建立。這份把「送審要準備的東西」一次備齊：可直接貼進 App Store Connect 的
> 文案、App Privacy / 年齡分級的答案、以及**只有你（開發者帳號持有人）能做**的步驟。
>
> ⚠️ 這版 **v1 有廣告**：復活／榔頭是 AdMob 獎勵廣告（`src/ads.ts` 的 `AdMobProvider`）。
> **2026-08-21 起改為非個人化廣告、不追蹤、已移除 ATT**（因應第三次退件，見 §10）。
> `docs/APP_PACKAGING.md` §6 說「v1 無廣告」已過時，以本檔為準。

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
| 追蹤 / ATT | **不追蹤**：非個人化廣告（`npa`），已移除 ATT 與 `NSUserTrackingUsageDescription`（§10） |
| 出口加密宣告 | `Info.plist` `ITSAppUsesNonExemptEncryption = false`（免年度加密文件） |
| 隱私政策頁 | https://jeffrey5304lab.github.io/cosmic-merge/privacy.html（已更新揭露 AdMob + ATT） |
| App Store 截圖 | `screenshots/appstore-6.9/`（1320×2868）+ `appstore-6.5/`（1242×2688）。**2026-08-22 改名後需重拍**（頂端標題現為「Novaborn」）：已用 `scripts/shots-novaborn.mjs` 產出 `novaborn-play.png`（成長盤面）與 `novaborn-blackhole.png`（黑洞終局）。重跑：`npm run dev` 後 `GAME_URL=http://localhost:5173 node scripts/shots-novaborn.mjs` |

> ⚠️ `ios/` 在 `.gitignore`，不進版控。若 `ios/` 被刪除重建，`Info.plist` 的
> `GADApplicationIdentifier` / `ITSAppUsesNonExemptEncryption`
> 要重新補（見上表值）。**注意**：改為不追蹤後，`NSUserTrackingUsageDescription`
> **不要**再加回去（§10）。

---

## 1. 只有你能做（帳號 / GUI 步驟）

1. **Apple Developer Program**：https://developer.apple.com/programs/ 註冊並付 $99/年。
2. **Xcode 登入**：Xcode → Settings → Accounts 加入你的 Apple ID；在 App target 的
   Signing & Capabilities 選你的 Team、開 Automatically manage signing。
3. **App Store Connect App**：App 已建立（Bundle ID `io.github.jeffrey5304lab.cosmicmerge`，
   SKU 如 `cosmicmerge01`）。**2026-08-22 起改名 `Novaborn`**：在**同一個 App 記錄**上、隨新版本
   把 App 名稱改成 `Novaborn` 即可——**切勿**為了改名開新 App／新 Bundle ID（多個相似 App 反而
   是 4.3 spam 訊號）。Bundle ID 送審後不可改，維持不變。
4. **打包上傳**：專案跑 `npm run cap:ios:release`（會用正式廣告 ID + 開 Xcode）→
   Xcode 選 **Any iOS Device (arm64)** → Product → Archive → Distribute App →
   App Store Connect → Upload。
5. **填 App Store Connect 資訊**：用下面第 2–4 節的內容。
6. **送審**：Add for Review → Submit。首次審核約 1–3 天。

---

## 2. 商店文案（可直接貼）

- **App 名稱（≤30 字）**：`Novaborn`（8 字）
  （2026-08-22 **改名定案**。原 `Cosmic Merge` 在 App Store 上與其他開發者的遊戲**直接撞名**
   （Anton Borries 的「Cosmic Merge」、Scott Brant 的「Cosmic Merge Game」…還有一整叢 Cosmic/
   Planet Merge），這是 4.3(a) spam 的具體觸發點之一。改名為 `Novaborn`（＝從黑洞塌縮中「誕生
   的新星」，對應本作核心：合併→黑洞→發現新恆星），完全跳脫 cosmic/merge/planet 飽和字群。
   刻意**不加** `Cosmic`/`Merge`/`Planet` 之類的副名，避免又落回被抓的字群。網查無同名 App，
   但**最終以 ASC 送名稱時檢查 + 商標查詢為準**。Bundle ID 不變。）
- **副標 Subtitle（≤30 字）**：`Grow worlds, discover stars`（27 字）
- **分類**：Primary = **Games**；子分類 **Puzzle** + **Casual**
- **關鍵字（≤100 字，逗號分隔不留空白）**：
  `star,discover,blackhole,supernova,space,galaxy,nebula,stargazing,astronomy,relax,idle,casual,drop`
  （**刻意移除 `suika`/`watermelon`/`merge`/`2048`/`planet`/`cosmic`/`fruit`/`ball` 等通用/撞名字**
   ——那些是模板農場最愛、最容易觸發 4.3(a)；改成「發現新恆星／黑洞」主軸。97 字元。）
- **宣傳文字 Promotional Text（≤170 字，可隨時改不需審核）**：
  `Grow tiny worlds into blazing Suns, then collapse two Suns into a black hole and discover a brand-new star. A cozy, hand-drawn cosmic puzzle you play one-handed.`
- **Support URL**：`https://jeffrey5304lab.github.io/cosmic-merge/`
- **Marketing URL（選填）**：`https://jeffrey5304lab.github.io/cosmic-merge/`
- **Privacy Policy URL**：`https://jeffrey5304lab.github.io/cosmic-merge/privacy.html`
- **版權 Copyright**：`2026 Jieway Chou`（權利人本名；版權欄標示所有權人，不需與商店名一致，2026-08-10 定案）

### 描述 Description（≤4000 字）

```
Novaborn is a cozy, hand-drawn cosmic puzzle. Drop cute worlds into a storybook
night sky — when two matching worlds touch, they fuse into the next one up. Grow
from a tiny meteor to the Moon, Mars, Earth… all the way to a blazing Sun.

Then the real magic: merge two Suns and they collapse into a BLACK HOLE that
swallows the whole board — and out of it, a brand-new star is born. Discover and
name real stars beyond the Sun — Proxima, Sirius, Vega and more — one collapse at
a time. There is always a new star to find.

Easy to learn, hard to put down. One thumb, endless "just one more drop."

FEATURES
• Grow worlds from Meteor to the Sun — an 11-step evolution chain
• BLACK HOLE finale — merge two Suns into a full-screen black hole that clears
  the board in a gorgeous cutscene
• Endless star discovery — every black hole reveals a new real star to catalogue
• Hand-drawn "cozy paper" art — wobbly ink lines, watercolor nebulae, paper grain
• Worlds with feelings — they blink, smile when they merge, and sweat when the
  sky gets crowded
• Chain COMBOs with juicy particles, shockwaves and screen shake
• Global leaderboard — submit your score and country, chase the world top 10
• Achievements, lifetime stats, and a shareable score card
• Generative lo-fi music, no audio files — pure vibes
• Plays offline, portrait, one-handed

Free to play. Optional rewarded ads let you revive a run or earn a hammer — never
forced, nothing locked behind them.
```

---

## 3. App Privacy 問卷（App Store Connect → App Privacy）

> 🔴 **2026-08-21 重大變更（因應第三次退件 5.1.2(i)，見 §10）**：本 App 已改為
> **完全不追蹤（No Tracking）**——一律請求「非個人化廣告」(`npa`，見 `src/ads.ts`)、
> 不使用 IDFA、已移除 ATT。因此 App Privacy 一定要對應改成「**不用於追蹤你**」，
> 否則標籤與行為不符會再被 5.1.2(i) 退。以下為**更新後**的正確勾法。

App 用了 **Google AdMob**（廣告）與 **Supabase**（排行榜）。

**Data Used to Track You** → **無**（此區塊全部不勾；我們不做跨 App／跨網站追蹤）

**Data Linked / Not Linked**
| 資料類型 | 來源 | 目的 | Linked to identity? | Used for tracking? |
|---|---|---|---|---|
| Device ID | AdMob | Third-Party Advertising | No | **No** |
| Advertising Data | AdMob | Third-Party Advertising | No | **No** |
| Product Interaction（Usage Data） | AdMob | Third-Party Advertising / Analytics | No | No |
| Coarse Location（IP 推估，選填視設定） | AdMob | Third-Party Advertising | No | No |
| Crash / Performance / Diagnostics | AdMob SDK | App Functionality | No | No |
| User Content（自選暱稱） | Supabase 排行榜 | App Functionality | No | No |
| Gameplay Content（分數、國家、最高星球） | Supabase 排行榜 | App Functionality | No | No |

> 註：暱稱是「自選顯示名稱」非真實姓名，歸類 User Content；國家是清單自選，非 GPS/IP 定位。
> 我們沒有帳號系統，排行榜資料不與身分連結。

**送審時的 IDFA 宣告**：Advertising Identifier 使用 = **No**（改為非個人化廣告後不再存取
IDFA、也沒有 ATT）。若 App Store Connect 仍問到 IDFA，選 **No**。

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

NO TRACKING
- This app does not track users. It uses no cross-app/cross-site tracking and
  does not access the advertising identifier (IDFA). All rewarded ads are
  requested as NON-PERSONALIZED. The app therefore does not use App Tracking
  Transparency, and App Privacy is set to "not used to track you."

CONSTELLATIONS (signature mechanic)
- A target real constellation is always shown at the top of the screen. Each
  planet you merge lights one of its stars; completing it unlocks the next
  constellation. Tap the top bar (or the SKY tab at the bottom) to see the full
  star chart. This is visible immediately on the first screen.

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
- [ ] App 名稱在版本頁改成 `Novaborn`（同一個 App 記錄，勿開新 App）
- [ ] App Privacy 已改成「不追蹤」（Device ID / Advertising Data 取消 Used to Track）
- [ ] 送出前商店搜「Novaborn」再確認一次無撞名 / 商標問題（舊名 Cosmic Merge 已確認撞名，故改名）
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

---

## 9. 第二次被退件：ATT 彈窗找不到（2026-08-17，Guideline 2.1）

> Submission ID 07378622-aac7-409e-9a08-b00f8486fe27，審於 iPad Air 11" (M3) / iPadOS 26.6。
> 原因：*"uses AppTrackingTransparency framework, but we are unable to locate the ATT
> permission request."* 根因：舊版把 ATT 延到「第一次看廣告」才問，審查員沒觸發到。
>
> 修法（build 3）：`src/ads.ts` 的 `warmup()` 改成 App 啟動就問 ATT（在 AdMob 初始化、
> 收集任何可追蹤資料之前），並加 `whenAppActive()` 等 App active 才問避免靜默失敗。

**流程**：build 3 archive + 上傳 + Processing 完成 → 實機錄影（全新安裝，ATT 一啟動就跳）
→ 影片上 Google Drive（知道連結的人可檢視，已用匿名下載驗證回傳真實 MP4 檔頭）→ ASC 回覆
下方文字 + 貼進 App Review Information → Notes → 選 build 3 → 「重新提交至 App 審查」。

### 可直接貼上的回覆（回覆審查 + Notes 兩處都貼）

```
Thank you for the follow-up review.

We have addressed the App Tracking Transparency issue. In the previous build the
ATT permission request was only triggered later in the session (the first time a
player chose to watch a rewarded ad), which is why it may not have appeared
during review.

In this new build (1.0, build 3) the App Tracking Transparency permission request
is now presented at app launch, before the advertising SDK is initialized and
before any data that could be used for tracking is collected.

A screen recording captured on a physical iPhone is provided at the link below.
It shows:
- Launching the app from a fresh install (tracking permission reset)
- The App Tracking Transparency permission request appearing at launch, before
  any tracking data is collected
- The user flow that follows the permission request

Screen recording: https://drive.google.com/file/d/1NmbIEIOCC6kKXlOv8ANQhZB6vnEhdGNq/view?usp=sharing

Please review build 1.0 (3). Thank you.
```

---

## 10. 第三次被退件：4.3(a) Spam + 5.1.2(i) 追蹤（2026-08-19，build 1.0 (3)）

> Submission ID `07378622-aac7-409e-9a08-b00f8486fe27`，於 iPhone 17 Pro Max / iOS 26 審核。
> 這次同時兩條：

### (A) 5.1.2(i) — 隱私標籤說有追蹤，但找不到 ATT
根因：App Privacy 勾了 Device ID + Advertising Data「用於追蹤」，但這版把 ATT 移到啟動仍被判
「行為與標籤不一致 / 找不到追蹤同意」。**採用最乾淨的解法＝乾脆不追蹤**：

- 程式碼（已改，commit 見下）：`src/ads.ts` 一律以 `npa: true` 請求「非個人化廣告」、移除所有
  `requestTrackingAuthorization` / `whenAppActive` / `ensureTracking`；`Info.plist` 移除
  `NSUserTrackingUsageDescription`。
- **你要做（App Store Connect，Account Holder/Admin）**：App Privacy → 把 Device ID 與
  Advertising Data 的「**Used to Track You**」全部取消（改成 No），送出更新（見 §3 已更新的勾法）。
  這一步是這條退件能過的關鍵——**標籤一定要與「不追蹤」的行為一致**。

### (B) 4.3(a) — Spam（看起來像換皮的 merge 模板）
根因：**名稱直接撞名** + 概念與市面大量 Suika/2048 合成遊戲雷同。App Store 上已有其他開發者的
「Cosmic Merge」「Cosmic Merge Game」以及一整叢 Cosmic/Planet Merge 物理遊戲——舊名正落在這個
飽和字群裡。策略（2026-08-22 定案，**不再靠星座玩法**，改走「改名 + 突顯既有原創性」）：

1. **改名 `Cosmic Merge` → `Novaborn`**（見 §2）。這是最具體的觸發點：舊名與他人 App 直接撞名。
   新名跳脫 cosmic/merge/planet 字群，且對應本作真正核心「合併→黑洞→誕生新恆星」。
   （同時同步改了遊戲內標題 `src/strings.ts`、`index.html` meta、`Info.plist` `CFBundleDisplayName`。）
2. **改寫商店 metadata**（見 §2）：關鍵字/副標/描述改以「發現新恆星／黑洞」為主軸，
   移除 suika/merge/2048/planet/cosmic 等通用/撞名字。
3. **在回覆中突顯既有的原創機制**：黑洞終局過場、黑洞後**無盡發現真實恆星**的階梯（Proxima、
   Sirius…Polaris）、手繪紙感美術、有表情情緒的星球——這些都不是模板功能。
4. **主張原創**：自建、非模板、非換皮、單帳號單 App、素材原創。

> 註：2026-08-21 曾實作「星座任務」當招牌機制，但 2026-08-22 依使用者決定**移除**（與既有的
> 恆星發現階梯主題重疊、顯多餘）；差異化改由「改名 + 既有黑洞/恆星發現獨特性 + metadata + 申訴」承擔。

### 可直接貼上的回覆（App Store Connect → 回覆 App 審查；同時貼進 App Review Information → Notes）

```
Thank you for the review. We have addressed both items.

Guideline 5.1.2(i) — Tracking / ATT:
This app does NOT track users. It shows no cross-app or cross-site tracking and
does not access the device advertising identifier (IDFA). Rewarded ads are
requested as NON-PERSONALIZED ads only. Because the app does not track, it does
not use the App Tracking Transparency framework, and we have removed the ATT
usage string from the app. We have also updated the App Privacy information in
App Store Connect so that Device ID and Advertising Data are marked as NOT used
to track you, to match the app's behavior.

Guideline 4.3(a) — Spam:
This app is an original game built from scratch by a single developer. It is not
based on a third-party template, is not a repackaged app, and is not one of
several similar apps across accounts. All art, sound, and code are our own.

To make its identity distinct, we have renamed the app to "Novaborn" and rewritten
its metadata. The game's concept is not just merging: you grow worlds up to a Sun,
then merging two Suns collapses them into a full-screen BLACK HOLE that clears the
whole board, and from that collapse a brand-new real star is born. Players then
endlessly discover and catalogue real stars beyond the Sun (Proxima, Sirius, Vega,
and more). This black-hole collapse and endless star-discovery loop, together with
our hand-drawn "cozy paper" artwork and worlds with facial expressions and moods,
are original and are not template features.

Please review the updated build. Thank you for your time.
```

### 送審流程（build 4）
1. 程式碼改動已在本機（改名 + 移除星座 + 不追蹤）：`src/ads.ts`、`src/strings.ts`、`index.html`、
   `src/main.ts`、`src/style.css`、`src/game.ts`（後三者已還原到加星座前）。先 commit。
2. `ios/App/App/Info.plist`：已移除 `NSUserTrackingUsageDescription`、`CFBundleDisplayName` 改
   `Novaborn`（`ios/` 不進 git，僅本機）。
3. 版本號 build 3→4：`project.pbxproj` 兩處 `CURRENT_PROJECT_VERSION` 改 4。
4. `npm run build:release && npx cap sync ios` →（Xcode Organizer）Archive → Upload。
5. **App Store Connect：**
   - **App 名稱改 `Novaborn`**（隨新版本一起改；同一個 App 記錄，**不要**開新 App／新 Bundle ID）。
   - **App Privacy 改成不追蹤（見 §3）** ← 這步別忘，否則 5.1.2(i) 會再退。
   - 更新 §2 的副標/關鍵字/描述。
6. 換上顯示新名字「Novaborn」的新截圖（見 §0；用 `scripts/shots-novaborn.mjs` 重跑）。
7. 貼上上面的回覆 → 選 build 4 →「重新提交至 App 審查」。
