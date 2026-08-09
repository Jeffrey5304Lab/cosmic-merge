# 上架 App（Capacitor 封裝）

把現有 Web 版包成 iOS / Android 原生 App。Capacitor 設定、安全區 CSS、build 腳本已就緒；
以下指令需在**裝好原生工具鏈的機器**上執行（這台環境沒有 Xcode/Android SDK，無法在此編譯）。

## 1. 前置工具

**共用**
- Node 20+（與本專案一致；Capacitor 7）

**iOS**（需 macOS）
- Xcode（App Store 安裝）+ 一次 `xcodebuild -runFirstLaunch`
- CocoaPods：`sudo gem install cocoapods`
- Apple Developer 帳號（$99/年）

**Android**
- Android Studio（含 Android SDK）
- JDK 17（Android Studio 內建，或 `brew install openjdk@17`）
- Google Play 開發者帳號（$25 一次）

## 2. 一次性：產生原生專案

```bash
npm install
npm run build              # 產生 dist/
npx cap add ios            # 建立 ios/ 原生專案（跑 pod install）
npx cap add android        # 建立 android/ 原生專案
```

> `ios/` 與 `android/` 已在 `.gitignore`（可重新產生）。若想入庫做版本控管，移除 .gitignore 那兩行即可。

## 3. 日常：改完 web 後同步進原生

```bash
npm run cap:ios        # build + sync + 開 Xcode
npm run cap:android    # build + sync + 開 Android Studio
# 或只同步不開 IDE：
npm run cap:sync
```

在 Xcode / Android Studio 按 Run 即可在模擬器或真機跑。

## 4. App 圖示與啟動畫面

來源圖**已用遊戲本身的星球美術生成好**，放在 `assets/`：
- `assets/icon.png`（1024²，微笑地球＋夜空，全出血供 OS 圓角遮罩）
- `assets/splash.png` / `assets/splash-dark.png`（2732²，地球置中於奶油底）

產生各平台尺寸（一行）：

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#F4E9D7' --splashBackgroundColor '#F4E9D7'
```

> 想換圖示風格：直接替換 `assets/icon.png`（1024²）再重跑上面指令即可。

## 5. 設定重點

- **Bundle ID**：`capacitor.config.ts` 的 `appId = io.github.jeffrey5304lab.cosmicmerge`
  ⚠️ **送審後不可變更**——要改成自有網域請在首次送審前改好。
- **版本**：iOS 在 Xcode（Version / Build）、Android 在 `android/app/build.gradle`（versionName / versionCode）。
- **方向**：已鎖直向（Capacitor 預設跟隨 manifest；如需強制，在原生專案設定）。
- **安全區**：CSS 已用 `env(safe-area-inset-*)` + `viewport-fit=cover`，瀏海/home indicator 不會壓到內容。
- **Service Worker**：原生環境資產為本地，SW 影響不大；若發現快取怪異可在原生 build 關閉註冊。

## 6. ⚠️ 上架前必做

> ⚠️ **此節部分內容已過時**。v1 **已改成有廣告**（AdMob 獎勵廣告，見 `src/ads.ts`）。
> iOS 送審完整清單（文案／隱私問卷／分級／步驟）請看 **`docs/IOS_SUBMISSION.md`**。

- [x] 廣告：原生 App 走 **AdMob 獎勵廣告**（復活／榔頭）；Web 版維持 `DirectGrantProvider` 直接授予。
- [x] 隱私政策：`public/privacy.html`（已揭露 AdMob + ATT）→
  `https://jeffrey5304lab.github.io/cosmic-merge/privacy.html`。聯絡信箱 `mngutoysports@gmail.com`。
- [ ] **資料安全表單**：App Store 隱私標籤 / Google Play Data Safety 要勾選收集項目。
- [ ] **名稱查重**：商店搜尋「Cosmic Merge」確認無撞名 / 商標問題。
- [ ] **內容分級**：填寫問卷（本作預期 4+/Everyone）。

## 7. 商店素材

- App 截圖（各機型尺寸，iOS 需 6.7" / 6.5"；Android 多尺寸）
- Android **feature graphic**（1024×500）
- 文案：標題、副標、描述、關鍵字、分類（Games › Puzzle）

## 8. 送審流程（摘要）

**iOS**：App Store Connect 建 App → Xcode Archive → 上傳 → TestFlight 測 → 填隱私/分級 → 送審（約 1–3 天）
**Android**：Play Console 建 App → 上傳 AAB（`./gradlew bundleRelease`）→ 內測 → 填問卷 → 正式（數小時–1 天）

---

目前狀態：Capacitor 7 已裝、`capacitor.config.ts` 已設、安全區 CSS 已加、build 腳本已加。
下一步建議：① 我把 Mock 廣告改成 v1 即時授予；② 我起草隱私政策頁。
