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
  if (musicGain) musicGain.gain.value = m ? 0 : 1
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

/* ══════════════ 生成式 lo-fi BGM（零音檔） ══════════════ */

let musicStarted = false
let musicGain: GainNode | null = null

/** C 大調溫暖進行：Cmaj7 → Am7 → Fmaj7 → G7 */
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23],
]
/** C 五聲音階（高八度），撥弦旋律用 */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0]

function scheduleChord(ac: AudioContext, out: AudioNode, freqs: number[], at: number, dur: number) {
  // 和弦墊：慢起音正弦
  for (const f of freqs) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(0.035, at + 1.1)
    g.gain.setValueAtTime(0.035, at + dur - 1)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(g).connect(out)
    osc.start(at)
    osc.stop(at + dur)
  }
  // 低音根音
  const bass = ac.createOscillator()
  const bg = ac.createGain()
  bass.type = 'sine'
  bass.frequency.value = freqs[0] / 2
  bg.gain.setValueAtTime(0.0001, at)
  bg.gain.linearRampToValueAtTime(0.05, at + 0.4)
  bg.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  bass.connect(bg).connect(out)
  bass.start(at)
  bass.stop(at + dur)
  // 偶爾的五聲音階撥弦（0～2 顆音）
  const plucks = Math.floor(Math.random() * 3)
  for (let i = 0; i < plucks; i++) {
    const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]
    const t0 = at + 0.5 + Math.random() * (dur - 1.5)
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = f
    g.gain.setValueAtTime(0.03, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7)
    osc.connect(g).connect(out)
    osc.start(t0)
    osc.stop(t0 + 0.7)
  }
}

/** 啟動 BGM（需在使用者互動後呼叫，符合 autoplay 政策）；冪等 */
export function startMusic() {
  if (musicStarted) return
  const ac = ensureCtx()
  if (!ac) return
  musicStarted = true

  musicGain = ac.createGain()
  musicGain.gain.value = muted ? 0 : 1
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 950 // lo-fi 悶悶的暖感
  filter.connect(musicGain).connect(ac.destination)

  const chordDur = 3.6
  let bar = 0
  let nextTime = ac.currentTime + 0.15
  // lookahead 排程：每 600ms 往前排 1.2 秒
  setInterval(() => {
    // 分頁退到背景時 timer 被節流，nextTime 可能落後 currentTime 一大截：
    // 直接快轉到現在，避免切回分頁瞬間補排幾百顆過期震盪器（CPU 尖峰＋疊音）
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.1
    while (nextTime < ac.currentTime + 1.2) {
      scheduleChord(ac, filter, CHORDS[bar % CHORDS.length], nextTime, chordDur + 0.4)
      bar++
      nextTime += chordDur
    }
  }, 600)
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
