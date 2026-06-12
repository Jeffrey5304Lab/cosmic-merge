/** WebAudio 合成音效：免素材，pop 音高隨星球階級上升 */
let ctx: AudioContext | null = null

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null // 不支援 WebAudio 時靜音，遊戲照常進行
  }
}

const MUTE_KEY = 'cosmic-merge:muted'

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

let muted = loadMuted()
export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  } catch {
    /* 私密模式忽略 */
  }
}
export function isMuted() {
  return muted
}

function blip(freq: number, duration: number, type: OscillatorType, gain: number, when = 0) {
  const ac = ensureCtx()
  if (!ac || muted) return
  const t0 = ac.currentTime + when
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t0 + duration)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + duration)
}

/** 投放星球 */
export function playDrop() {
  blip(220, 0.08, 'sine', 0.15)
}

/** 合成：階級越高音越高、越華麗 */
export function playMerge(tier: number) {
  const base = 260 + tier * 60
  blip(base, 0.12, 'triangle', 0.22)
  blip(base * 1.5, 0.1, 'sine', 0.12, 0.05)
  if (tier >= 7) blip(base * 2, 0.18, 'sine', 0.1, 0.1) // 大星球加一層泛音
}

/** 合出太陽的小號角 */
export function playFanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => blip(f, 0.25, 'triangle', 0.18, i * 0.12))
}

/** 遊戲結束 */
export function playGameOver() {
  const notes = [392, 330, 262, 196]
  notes.forEach((f, i) => blip(f, 0.3, 'sawtooth', 0.08, i * 0.15))
}
