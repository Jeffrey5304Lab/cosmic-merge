# 宇宙合併 Cosmic Merge ☀️

手繪紙感（cozy paper）風格的西瓜遊戲式物理合成遊戲——
把可愛的星球丟進繪本夜空，兩顆相同的星球碰在一起就會合體升級，從小隕石一路合到太陽！

A Suika-style physics merge game with a hand-drawn cozy paper aesthetic.
Drop cute planets into a storybook night sky and merge your way from Meteor to the Sun.

![遊玩畫面](screenshots/desktop-playing.png)

## 特色 Features

- 🪐 **11 級進化鏈**：隕石 → 月球 → 水星 → 火星 → 金星 → 地球 → 海王星 → 天王星 → 土星 → 木星 → **太陽**
- ✍️ **手繪紙感美術**：抖動墨水邊線、紙剪陰影、水彩星雲、紙張顆粒，全程 Canvas 自繪零素材
- ⚡ **連鎖 COMBO**：1.5 秒內連續合成，倍率最高 ×8，配衝擊波 + 粒子 + 螢幕震動
- 🗓️ **每日挑戰**：日期種子決定星球序列，全世界今天玩同一局
- 🏆 **本地排行榜**：前 10 名紀錄，結算畫面即時顯示本局名次
- 📸 **成績分享卡**：一鍵生成手繪風成績圖，原生分享（手機）或下載（桌面）
- 💫 **復活機制**：每局一次，看（模擬）廣告清掉上方星球續玩——獎勵式廣告位已就緒
- 🔨 **道具**：小錘子敲掉任一顆（看廣告獲得）、換球（current↔next 免費互換）
- 🎵 **生成式 lo-fi BGM**：WebAudio 和弦墊 + 五聲音階撥弦，零音檔
- 📱 **觸控 / 滑鼠 / 鍵盤**全支援、合成觸覺震動、PWA 離線可玩（Service Worker）

> 廣告皆走 `src/ads.ts` 抽象層，目前是 Mock 實作；上線接 AdMob / H5 Games Ads 只需替換一個 Provider。

## 操作 Controls

| 操作 | 桌面 | 手機 |
|---|---|---|
| 瞄準 | 移動滑鼠 / ← → | 拖曳 |
| 投放 | 點擊 / 空白鍵 | 放開 |

星球堆超過上方虛線 1.2 秒遊戲結束。

## 開發 Development

```bash
npm install
npm run dev      # 開發伺服器
npm test         # vitest（28 tests：純邏輯 + 無頭物理整合）
npm run build    # 產線建置（tsc + vite）
node scripts/screenshot.mjs   # Playwright 截圖驗收（需全域 playwright）
```

## 技術 Tech

| 面向 | 選擇 |
|---|---|
| 建置 | Vite 5 + TypeScript（嚴格模式） |
| 物理 | matter-js（碰撞、堆疊、合成偵測） |
| 渲染 | Canvas 2D 手繪風自繪（抖動邊線 + 紙剪陰影 + 表面紋理） |
| 音效 | WebAudio 合成（零音檔素材） |
| 測試 | Vitest 單元 + 無頭物理整合測試、Playwright E2E 驗收 |
| 儲存 | localStorage（最佳紀錄 / 排行榜 / 每日最佳 / 偏好） |

架構分層：**純邏輯**（`logic.ts`、`planets.ts`、`leaderboard.ts`）零 DOM 依賴可直接單測；
**物理與渲染**（`game.ts`、`render.ts`）；**UI 接線**（`main.ts`、`i18n.ts`）。

## Roadmap

- [ ] 部署上線（GitHub Pages / Vercel）
- [ ] Capacitor 包裝 iOS / Android App
- [ ] Service Worker 完整離線
- [ ] 線上排行榜
- [ ] 星球皮膚主題（水果、甜點、貓咪）

## License

MIT
