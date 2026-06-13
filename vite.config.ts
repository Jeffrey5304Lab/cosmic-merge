import { defineConfig } from 'vite'

// 相對 base：本機 dev 仍在根路徑，build 後可放在任意子路徑
// （GitHub Pages 專案站 /cosmic-merge/ 也能正確載入資源）。
export default defineConfig({
  base: './',
})
