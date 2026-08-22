import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // ⚠️ 上架後 bundle id 不可變更——首次送審前若要改成自有網域請先改這裡
  appId: 'io.github.jeffrey5304lab.cosmicmerge',
  appName: 'Novaborn',
  webDir: 'dist',
  // 載入畫面背景＝奶油紙底，避免冷啟動白屏
  backgroundColor: '#F4E9D7',
  ios: {
    backgroundColor: '#F4E9D7',
  },
  android: {
    backgroundColor: '#F4E9D7',
  },
}

export default config
