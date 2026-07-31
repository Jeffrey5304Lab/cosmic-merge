# Session Notes — 2026-08-01（深夜自主 UX 優化）

> 使用者睡前要求：以玩家角度持續 review／測試，改善 UI/UX、讓遊戲更順更好玩更「上癮」。
> 特別點名：**revive（復活）按鈕不夠直觀**。
> 沿用過夜慣例：**commit 只在本地，沒有 push**（正式部署留給早上 review 後決定）。

起點 commit：`cc02fdd`（wire up real AdMob rewarded ad unit ID）

---

## ☀️ 早安摘要（先看這段）

這次是**聚焦、已驗證**的一筆改動，不是大批量。核心把 revive 按鈕從「看不懂」變成「一眼就懂」。

- **本地 commit**：`ee73455` feat: revive button → clear "Continue Playing" offer
- 全程 `tsc` ✔ / 57 測試 ✔ / `vite build` ✔；**game-over 卡片已在 iPhone 16 Pro 模擬器實機截圖驗證**。
- iOS 專案已 `cap sync` + 重新 build 到最新（模擬器上是乾淨的最終版，無測試殘留）。
- 想上線：`git push origin main`（會觸發 GitHub Pages 部署）。

---

## ✅ 做了什麼：revive 按鈕重新設計（`ee73455`）

**問題（從玩家角度）**：舊按鈕「💫 Revive」有四個看不懂：
1. 沒說它是「**續玩本局**」（而非重新開始）；
2. 沒說它會**清掉頂端的星球**騰出空間；
3. 沒說要**看一段獎勵廣告**——點下去廣告突然全螢幕跳出，像被雷到；
4. 它被埋在卡片**最底**、排行榜/送出按鈕的下方，最該被看到的「要不要繼續」反而最後才看到。
5. 「💫」這顆表情跟 game-over 標題的表情重複，訊號很弱。

**改法**：
- 文案改雙行：**「▶ Continue Playing」＋「Watch a short ad · clears the top」**
  → 廣告、續玩、清頂端三件事點之前就講清楚（誠實、不像陷阱）。
- **位置上移**到分數正下方，做成**滿版、最醒目的主行動**，加**輕微脈動**（`prefers-reduced-motion` 會自動關閉）吸引目光。
- **載入/失敗回饋**：載入中顯示「Loading ad…」；沒廣告可播顯示「No ad available · tap to try again」，2.4s 後自動還原。慢速連線不會再像「按了沒反應」。
- **續玩後 toast**：「Second chance! Top cleared ✨」——卡片關掉、玩家視線回到棋盤時，明確告訴他發生了什麼。

改動檔案：`index.html`（卡片結構）、`src/style.css`（`.btn-revive` 雙行+脈動）、
`src/strings.ts`（新增 revive 各狀態文案）、`src/main.ts`（`setReviveLabel()` 狀態機 + 點擊流程 + toast）。

---

## 🐛 無頭多策略試玩壓力測試 — 找到並修掉 2 個真 bug

你要求「持續試玩、不同策略、找 bug」。我寫了一支無頭 fuzz 測試 `src/playtest.sim.test.ts`，
用真的 `Game`（含 matter-js 物理）跑很多場、5 種投放策略（置中／隨機／三欄／貼牆／貪婪）＋
猛丟／黑洞／復活／混合輸入／長閒置，每一幀檢查不變量（NaN、越界、速度爆衝、爆場、分數倒退、
結束只觸發一次）。**離線另跑過一次 200 場 sweep，修完後零異常。**

**Bug 1（`1d024fc`）— 星球被擠穿側牆**：場面壓得很滿（快輸時），matter-js 會把小星球
擠穿 60px 厚的側牆，跑到 x=-77（整顆掉出畫面外）。修法：每個物理幀 `containBodies()` 安全網把
越界的星球拉回場內＋抵銷橫向速度；解算迭代 position 6→8、velocity 4→6 降低發生率。正常靠牆
靜止的星球不受影響（peakBodies ~50，無效能疑慮）。

**Bug 2（`0eccc27`）— 黑洞過場中還能敲榔頭**：`smash()` 只擋 `state==='over'`，沒擋黑洞
過場（`drop()` 有擋）。玩家可在 2.7s 吞噬動畫中敲掉正被吸入的星球（浪費榔頭＋那顆的分數沒被
算進黑洞）。修法：`smash()` 比照 `drop()` 也擋 `this.blackHole`；新增 `inBlackHole` getter。
（不會 crash——`updateBlackHole` 每幀重查 bodies——但 UX/計分錯。）

**查過但不是 bug**：`processMerges` 的 mergeQueue 只在單一 `update()` 內產生並清空，玩家 smash
無法插進那個空檔，所以「敲掉正要合成的星球」不可達；多重碰撞配對也有 `merged` Set 正確處理。

測試套件：57 → **62 通過**；`npm test` 從 38s 精簡到 ~18s（fuzz 場數收斂、加顯式 timeout，
避免長同步測試在 orchestrator 下偶發 flake）。tsc + build 綠。

> ⚠️ 這 3 筆（`1d024fc` / `0eccc27` / `d8795d8`）目前**只在本地**，等你早上 review 後 push。

---

## 🔎 100 次試玩 heuristic review — 給你早上挑的清單

我以「玩到第 100 局的玩家」視角走過整個結算與續玩流程。除了已修的 revive，其餘我**刻意沒擅自動**
（多屬主觀手感/平衡，依你過往偏好需你拍板；平衡更是你明講過別亂改）。依「上癮度 CP 值」排序：

**A. 低風險、我可以直接做（等你一句話）**
- A1. **第二次續玩**：目前一局只能復活一次。很多合成遊戲允許「再看一支廣告續第二次」（可遞增門檻）。
  留存槓桿明顯，但會讓單局變長、影響節奏——想要我就加。
- A2. **兩顆珊瑚色按鈕**：Continue 與「Submit to Leaderboard」同為珊瑚色。目前靠「Continue 在上+脈動」
  區分，可接受；若你想更乾淨，可把 Submit 降為蜂蜜黃。

**B. 手感/情緒鉤子（主觀，建議你看過再決定）**
- B1. **game-over 前的「差一點」慢鏡**：星球越線到卡片彈出之間加 ~0.4s 慢動作+輕微變暗，
  放大「啊～就差一點」的情緒，讓 Continue 更誘人。
- B2. **結算卡片的名次line**已有「再 X 分就超車！🔥」很好，可考慮加一個「你的歷史前 3 名」小徽章牆。

**C. 需產品決策（較大，不建議過夜自己做）**
- C1. 每日獎勵/連續登入 streak。
- C2. 難度/道具經濟微調——**依你先前決定，非經同意不動**。

---

## 註記
- 驗證方式：加一個 dev-only 臨時 hook 強制彈出結算卡片 → 模擬器截圖確認版面（雙行按鈕不擠、不裁切、
  脈動不造成 reflow）→ **已移除 hook**，最終 build 乾淨。
- Claude-in-Chrome 仍連不到 localhost（沿用過往限制），所以視覺一律走 iOS 模擬器截圖驗證。
- 廣告切換：一般 build 走測試廣告、`build:release` 才用正式 ID，本次改動不影響該機制。
