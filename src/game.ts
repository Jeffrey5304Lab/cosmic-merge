import Matter from 'matter-js'
import { BOARD, MAX_TIER, TIERS } from './planets'
import { ComboTracker, mergeScore, nextTier, pickDropTier } from './logic'
import { ParticleSystem } from './particles'
import {
  drawAimLine,
  drawBackground,
  drawDangerVignette,
  drawLoseLine,
  drawPlanet,
  makeStars,
  ShootingStars,
} from './render'
import { playDrop, playFanfare, playGameOver, playMerge } from './audio'
import { buzz } from './haptics'

const { Engine, Bodies, Body, Composite, Events } = Matter

interface PlanetMeta {
  tier: number
  /** 出生時間（秒），用於彈跳出生動畫與寬限期 */
  bornAt: number
  /** 是否由合併誕生（觸發開心臉與火花，普通掉落則否） */
  merged: boolean
  /** 上次開始打哈欠的時間（秒）；閒置夠久時隨機星球會輪流打哈欠，-999=沒在打 */
  yawnStart: number
}

/** 打哈欠動畫長度（秒） */
const YAWN_DUR = 1.4

export type GameState = 'ready' | 'playing' | 'over'

export interface GameCallbacks {
  onScore(score: number, best: number, maxTier: number): void
  onNext(tier: number): void
  onCombo(multiplier: number): void
  /** 每次合成出一顆新星球時觸發（resultTier=新星球階級、multiplier=當下連鎖倍率） */
  onMerge?(resultTier: number, multiplier: number): void
  onGameOver(score: number, best: number, maxTierReached: number): void
}

const BEST_KEY = 'cosmic-merge:best'

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(score))
  } catch {
    /* 私密模式等情況下忽略 */
  }
}

export class Game {
  state: GameState = 'ready'
  score = 0
  best = loadBest()
  maxTierReached = 0
  /** 每局限一次的復活是否已用掉 */
  reviveUsed = false

  private engine = Engine.create()
  private meta = new WeakMap<Matter.Body, PlanetMeta>()
  private particles = new ParticleSystem()
  private stars = makeStars(70)
  private meteors = new ShootingStars()
  private combo = new ComboTracker()
  private time = 0
  /** 物理固定步長累積器（秒）：讓 Engine.update 每次都用相同 delta */
  private accumulator = 0
  private currentTier: number
  private nextDropTier: number
  private aimX = BOARD.width / 2
  private dropCooldown = 0
  private dangerTime = 0
  private shake = 0
  private mergeQueue: Array<{ a: Matter.Body; b: Matter.Body }> = []
  /** 自上次投放後玩家「懸停未投」的秒數（閒置不耐煩用） */
  private waitTime = 0
  /** 全場一致的「焦躁等待」程度 0~1（閒置太久 → 不耐煩臉），平滑處理 */
  private idleMood = 0
  /** 下一次安排隨機星球打哈欠的遊戲時間（秒），閒置 15 秒後開始 */
  private nextYawnAt = 0

  private cb: GameCallbacks
  private rng: () => number

  constructor(cb: GameCallbacks, rng: () => number = Math.random) {
    this.cb = cb
    this.rng = rng
    this.currentTier = pickDropTier(this.rng)
    this.nextDropTier = pickDropTier(this.rng)
    this.engine.gravity.y = 1.1
    this.buildWalls()
    // 同階碰撞就排入合成佇列。collisionStart=剛接觸、collisionActive=持續接觸，
    // 兩者都聽：落定後才貼在一起的同階星球（看起來碰到卻沒合）也會被合掉。
    const queueMergeable = (e: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of e.pairs) {
        const ma = this.meta.get(pair.bodyA)
        const mb = this.meta.get(pair.bodyB)
        if (ma && mb && ma.tier === mb.tier && ma.tier < MAX_TIER) {
          this.mergeQueue.push({ a: pair.bodyA, b: pair.bodyB })
        }
      }
    }
    Events.on(this.engine, 'collisionStart', queueMergeable)
    Events.on(this.engine, 'collisionActive', queueMergeable)
    this.cb.onNext(this.nextDropTier)
    this.cb.onScore(this.score, this.best, this.maxTierReached)
  }

  private buildWalls() {
    const t = BOARD.wallThickness
    const opts = { isStatic: true, friction: 0.3 }
    Composite.add(this.engine.world, [
      Bodies.rectangle(BOARD.width / 2, BOARD.height + t / 2, BOARD.width + t * 2, t, opts),
      Bodies.rectangle(-t / 2, BOARD.height / 2, t, BOARD.height * 3, opts),
      Bodies.rectangle(BOARD.width + t / 2, BOARD.height / 2, t, BOARD.height * 3, opts),
    ])
  }

  private spawnPlanet(tier: number, x: number, y: number, merged = false): Matter.Body {
    const r = TIERS[tier].radius
    const body = Bodies.circle(x, y, r, {
      restitution: 0.25,
      friction: 0.25,
      frictionAir: 0.008,
      density: 0.0012,
    })
    this.meta.set(body, { tier, bornAt: this.time, merged, yawnStart: -999 })
    Composite.add(this.engine.world, body)
    return body
  }

  get aimPosition(): number {
    return this.aimX
  }

  /**
   * 復活（獎勵式廣告的兌現）：清掉上方 45% 的星球，繼續本局。
   * 每局限一次；成功回傳 true。
   */
  revive(): boolean {
    if (this.state !== 'over' || this.reviveUsed) return false
    this.reviveUsed = true
    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (m && body.position.y < BOARD.height * 0.45) {
        this.particles.burst(body.position.x, body.position.y, TIERS[m.tier].color, 8, 100)
        Composite.remove(this.engine.world, body)
      }
    }
    this.dangerTime = 0
    this.dropCooldown = 0.3
    this.state = 'playing'
    return true
  }

  /**
   * 小錘子：敲掉點擊處的星球，成功回傳 true。
   * 手指點擊不精準（最小星球半徑僅 17），給 24px 容忍、取最近的一顆。
   */
  smash(x: number, y: number): boolean {
    if (this.state === 'over') return false
    let target: Matter.Body | null = null
    let targetR = 0
    let bestD = Infinity
    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (!m) continue
      const r = TIERS[m.tier].radius
      const d = Math.hypot(body.position.x - x, body.position.y - y)
      if (d <= r + 24 && d < bestD) {
        bestD = d
        target = body
        targetR = r
      }
    }
    if (!target) return false
    const m = this.meta.get(target)
    if (!m) return false
    this.particles.ring(target.position.x, target.position.y, TIERS[m.tier].color, targetR * 1.6)
    this.particles.burst(target.position.x, target.position.y, TIERS[m.tier].color, 14, 160)
    Composite.remove(this.engine.world, target)
    playDrop()
    return true
  }

  /** 玩家瞄準（邏輯座標 x） */
  aim(x: number) {
    const r = TIERS[this.currentTier].radius
    this.aimX = Math.min(Math.max(x, r + 4), BOARD.width - r - 4)
  }

  /** 玩家投放 */
  drop() {
    if (this.state === 'over' || this.dropCooldown > 0) return
    this.state = 'playing'
    this.spawnPlanet(this.currentTier, this.aimX, BOARD.dropY)
    playDrop()
    this.currentTier = this.nextDropTier
    this.nextDropTier = pickDropTier(this.rng)
    this.aim(this.aimX) // 依新星球半徑重新夾住範圍
    this.cb.onNext(this.nextDropTier)
    this.dropCooldown = 0.45
    this.waitTime = 0
  }

  /** 重新開始 */
  restart() {
    Composite.clear(this.engine.world, false)
    this.buildWalls()
    this.mergeQueue = []
    this.score = 0
    this.maxTierReached = 0
    this.dangerTime = 0
    this.dropCooldown = 0
    this.accumulator = 0
    this.waitTime = 0
    this.idleMood = 0
    this.nextYawnAt = 0
    this.reviveUsed = false
    this.state = 'ready'
    this.currentTier = pickDropTier(this.rng)
    this.nextDropTier = pickDropTier(this.rng)
    this.combo = new ComboTracker()
    this.cb.onNext(this.nextDropTier)
    this.cb.onScore(this.score, this.best, this.maxTierReached)
  }

  update(dt: number) {
    this.time += dt
    this.dropCooldown = Math.max(0, this.dropCooldown - dt)
    this.shake = Math.max(0, this.shake - dt * 30)

    if (this.state !== 'over') {
      // 固定步長積分：每次 Engine.update 都用同一個 delta（1/60 秒），
      // matter-js 的速度校正恆為 1，幀率波動/點擊卡頓不再讓星球彈跳。
      const step = 1 / 60
      this.accumulator += dt
      let steps = 0
      while (this.accumulator >= step && steps < 5) {
        Engine.update(this.engine, step * 1000)
        this.accumulator -= step
        steps += 1
      }
      // 一次累積過多（分頁切回/長卡頓）：丟棄殘餘，避免追幀爆衝
      if (this.accumulator > step) this.accumulator = 0
      this.processMerges()
      this.checkGameOver(dt)
      // 閒置不耐煩：玩家懸停未投超過 5 秒，場上星球漸感焦躁
      if (this.state === 'playing' && this.dropCooldown === 0) this.waitTime += dt
      this.updateIdleMood(dt)
      this.scheduleYawns()
    }
    this.particles.update(dt)
    this.meteors.update(dt, this.time)
  }

  /** 更新「焦躁等待」情緒（全場一致的不耐煩）：玩家懸停未投，閒置 5 秒後開始、再 4 秒爬滿 */
  private updateIdleMood(dt: number) {
    const idleTarget = Math.min(1, Math.max(0, (this.waitTime - 5) / 4))
    this.idleMood += (idleTarget - this.idleMood) * Math.min(1, (idleTarget > this.idleMood ? 1.4 : 2.6) * dt)
  }

  /** 閒置超過 15 秒後，每隔幾秒挑一顆隨機星球打哈欠（無聊到打哈欠，增添趣味） */
  private scheduleYawns() {
    if (this.state !== 'playing' || this.waitTime <= 15) {
      this.nextYawnAt = this.time // 一旦閒置超過 15 秒，立刻能打第一個哈欠
      return
    }
    if (this.time < this.nextYawnAt) return
    const bodies = Composite.allBodies(this.engine.world).filter(b => this.meta.has(b))
    if (bodies.length > 0) {
      const m = this.meta.get(bodies[Math.floor(this.rng() * bodies.length)])
      if (m) m.yawnStart = this.time
    }
    this.nextYawnAt = this.time + 2.5 + this.rng() * 2.5 // 下一個哈欠 2.5~5 秒後
  }

  private processMerges() {
    const merged = new Set<Matter.Body>()
    for (const { a, b } of this.mergeQueue) {
      if (merged.has(a) || merged.has(b)) continue
      const ma = this.meta.get(a)
      if (!ma) continue
      const result = nextTier(ma.tier)
      if (result === null) continue
      merged.add(a)
      merged.add(b)

      const mx = (a.position.x + b.position.x) / 2
      const my = (a.position.y + b.position.y) / 2
      Composite.remove(this.engine.world, a)
      Composite.remove(this.engine.world, b)
      const child = this.spawnPlanet(result, mx, my, true)
      Body.setVelocity(child, { x: 0, y: -1.5 })

      const multiplier = this.combo.hit(this.time * 1000)
      const gained = mergeScore(result) * multiplier
      this.score += gained
      this.maxTierReached = Math.max(this.maxTierReached, result)
      if (this.score > this.best) {
        this.best = this.score
        saveBest(this.best)
      }

      const tierDef = TIERS[result]
      this.particles.ring(mx, my, tierDef.color, tierDef.radius * 2.2)
      this.particles.burst(mx, my, tierDef.color, 10 + result * 3, 120 + result * 25)
      this.particles.float(mx, my - tierDef.radius, `+${gained}${multiplier > 1 ? ` ×${multiplier}` : ''}`, '#F6EAC9')
      this.shake = Math.min(6, 1 + result * 0.5)
      if (result === MAX_TIER) playFanfare()
      else playMerge(result)
      // 手機觸覺回饋：大星球震久一點（原生走 Capacitor Haptics、含 iOS）
      buzz(8 + result * 3)

      this.cb.onScore(this.score, this.best, this.maxTierReached)
      this.cb.onCombo(multiplier)
      this.cb.onMerge?.(result, multiplier)
    }
    this.mergeQueue = []
  }

  private checkGameOver(dt: number) {
    let overflowing = false
    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (!m) continue
      const age = this.time - m.bornAt
      // 出生 1 秒寬限：剛投放的星球還在落下，不算溢出
      if (age > 1 && body.position.y - TIERS[m.tier].radius * 0.5 < BOARD.loseY) {
        overflowing = true
        break
      }
    }
    this.dangerTime = overflowing ? this.dangerTime + dt : 0
    if (this.dangerTime > 1.2) {
      this.state = 'over'
      playGameOver()
      this.cb.onGameOver(this.score, this.best, this.maxTierReached)
    }
  }

  get inDanger(): boolean {
    return this.dangerTime > 0
  }

  /** 場上星球數（不含牆），供測試與 debug */
  get bodyCount(): number {
    let n = 0
    for (const body of Composite.allBodies(this.engine.world)) {
      if (this.meta.has(body)) n++
    }
    return n
  }

  /** 場上最快星球速度（px/step），供測試與 debug：用來偵測物理是否被踢飛 */
  get maxBodySpeed(): number {
    let m = 0
    for (const body of Composite.allBodies(this.engine.world)) {
      if (!this.meta.has(body)) continue
      m = Math.max(m, Math.hypot(body.velocity.x, body.velocity.y))
    }
    return m
  }

  draw(g: CanvasRenderingContext2D) {
    g.save()
    if (this.shake > 0) {
      g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
    }
    drawBackground(g, this.stars, this.time)
    this.meteors.draw(g)
    drawLoseLine(g, this.time, this.inDanger)
    if (this.inDanger) {
      drawDangerVignette(g, this.time, Math.min(1, this.dangerTime / 1.2 + 0.4))
    }

    if (this.state !== 'over') {
      drawAimLine(g, this.aimX, TIERS[this.currentTier].radius, this.time)
      // 預備投放的星球（懸浮在頂端）
      const hover = Math.sin(this.time * 3) * 3
      drawPlanet(g, TIERS[this.currentTier], this.aimX, BOARD.dropY + hover, 0, 1, this.time)
    }

    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (!m) continue
      // 出生彈跳：0.25 秒內從 0.4 彈到 1
      const age = this.time - m.bornAt
      const scale = age < 0.25 ? 0.4 + 0.6 * easeOutBack(age / 0.25) : 1
      // 危機臉：已落定的星球越接近頂線越緊張（出生 1 秒寬限內不算）
      const topY = body.position.y - TIERS[m.tier].radius * 0.5
      const danger =
        this.state === 'over' || age <= 1
          ? 0
          : Math.min(1, Math.max(0, (BOARD.loseY + 40 - topY) / 50))
      // 打哈欠：sin 包絡，0→1→0（張嘴漸大再閉上）
      const yt = (this.time - m.yawnStart) / YAWN_DUR
      const yawn = yt >= 0 && yt <= 1 ? Math.sin(Math.PI * yt) : 0
      drawPlanet(g, TIERS[m.tier], body.position.x, body.position.y, body.angle, scale, this.time, body.id, m.merged ? age : 999, danger, this.idleMood, yawn)
    }

    this.particles.draw(g)
    g.restore()
  }
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
