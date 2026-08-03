# Android 打包指南（Capacitor）

> 2026-08-03 建立。`android/` 專案已由 `npx cap add android` 產生並設定好，但**尚未實際 build**
> （這台 Mac 還沒裝 Java + Android SDK）。以下是接手步驟。
> ⚠️ `android/` 在 `.gitignore` 內（跟 `ios/` 一樣，只存在本機）。若 `android/` 被刪除重建，
> 下面「已幫你設定好的原生調整」要重套。

## 已完成（我這邊）
- `npx cap add android` → 產生 `android/`，web 資產 + 外掛（AdMob、Haptics）已同步進去
- `AndroidManifest.xml`：
  - AdMob `com.google.android.gms.ads.APPLICATION_ID` = Google **測試** App ID（`ca-app-pub-3940256099942544~3347511713`）
  - `android:screenOrientation="portrait"`（直向鎖，與 iOS 一致）
- `app/build.gradle`：`versionName "1.0.0"`、`applicationId io.github.jeffrey5304lab.cosmicmerge`
- App 圖示 + 啟動畫面：用 `assets/icon.png`、`assets/splash*.png` 產生（`capacitor-assets generate --android`）
- 廣告測試/正式切換沿用既有機制：一般 build 走測試廣告；`npm run cap:android:release` 才用正式 ID

## 你要做的：一次性環境設定
這台 Mac 目前**沒有 Java、沒有 Android SDK**（但已裝 Android Studio）。最省事的路：
1. 開 **Android Studio** → 第一次會引導你安裝 **Android SDK**（照精靈按即可）
2. Android Studio 內建 JDK（JBR），Gradle 會自動用它——通常不必另外裝 Java
   - 若命令列也要用，可設：`export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
   - SDK 預設位置：`~/Library/Android/sdk`；可設 `export ANDROID_HOME="$HOME/Library/Android/sdk"`

## Build / 測試
```bash
npm run cap:android        # build web + cap sync + 開啟 Android Studio
```
在 Android Studio 裡：
1. 等 **Gradle sync** 跑完（第一次會下載相依套件，需幾分鐘）
2. 選一個 **模擬器**（或接實機，需開 USB 偵錯）→ 按 ▶ Run
3. 驗證：啟動畫面、直向、遊戲physics、🏆 排行榜（Supabase）、每日獎勵、續玩/榔頭看**測試廣告**、震動回饋（實機才有）

> 走測試廣告（安全）。真廣告只有 `npm run cap:android:release` 打包才會用。

## 上架前（你的側，我無法代做）
1. **AdMob 建 Android App**（跟 iOS 那次一樣，在 https://apps.admob.com）：
   - 拿到 Android **App ID**（`ca-app-pub-xxxx~yyyy`）→ 換掉 `AndroidManifest.xml` 的 meta-data value
   - 建一個 **Rewarded 廣告單元** → 把 ID 填進 `src/config.ts` 的 `REAL_REWARDED_ANDROID`
2. **正式打包**：`npm run cap:android:release` → Android Studio 內 **Build → Generate Signed Bundle/APK**
   → 產出簽章 **.aab**（Play Store 用）。第一次要建立 **上傳金鑰（keystore）**，妥善保存
3. **Google Play Console** 開發者帳號（一次性 $25）+ 商店頁（截圖/文案/隱私問卷）

## 備註
- Android 沒有 iOS 的 ATT 追蹤授權彈窗；`ads.warmup()` 的追蹤請求在 Android 是 no-op（外掛依平台處理）
- Android 13+ 需要 `AD_ID` 權限——由 play-services-ads SDK 自動 manifest-merge 加入，不用手動加
- `targetSdk` / `compileSdk` 版本在 `android/variables.gradle`，若 Play 要求更高目標版本再調
