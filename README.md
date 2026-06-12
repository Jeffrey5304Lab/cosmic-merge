# 宇宙合併 Cosmic Merge ☀️

西瓜遊戲（Suika Game）式的物理合成遊戲——把可愛的 chibi 星球丟進太空艙，
兩顆相同的星球碰在一起就會合體升級，從小隕石一路合到太陽！

![遊玩畫面](screenshots/desktop-playing.png)

## 玩法

- **移動滑鼠 / 手指拖曳**瞄準，**放開**投放星球
- 相同星球相撞 → 合體升級，得分為三角數列（越大顆分越多）
- **1.5 秒內連續合成**觸發 COMBO，倍率最高 ×8
- 星球堆超過上方警戒線 1.2 秒 → 遊戲結束
- 進化鏈：隕石 → 月球 → 水星 → 火星 → 金星 → 地球 → 海王星 → 天王星 → 土星 → 木星 → **太陽**

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm test         # vitest 單元測試（純邏輯層）
npm run build    # 產線建置（tsc + vite）
node scripts/screenshot.mjs   # Playwright 截圖驗收（需全域 playwright）
```

## 技術

| 面向 | 選擇 |
|---|---|
| 建置 | Vite 5 + TypeScript（嚴格模式） |
| 物理 | matter-js（碰撞、堆疊、合成偵測） |
| 渲染 | Canvas 2D 自繪（徑向漸層星球 + chibi 表情 + 粒子特效） |
| 音效 | WebAudio 合成（零音檔素材） |
| 測試 | Vitest（計分 / 抽選 / 連鎖邏輯與星球設定不變量） |
| 儲存 | localStorage 最佳紀錄 |

架構刻意把**純邏輯**（`logic.ts`、`planets.ts`）與**物理 / 渲染**（`game.ts`、`render.ts`）分層，
邏輯層零 DOM 依賴、可直接單元測試。

## Roadmap

- [ ] PWA（離線可玩、加入主畫面）
- [ ] Capacitor 包裝 iOS / Android App
- [ ] 觸覺回饋（手機合成震動）
- [ ] 每日挑戰模式 + 排行榜

## License

MIT
