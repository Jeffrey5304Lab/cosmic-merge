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

const { Engine, Bodies, Body, Composite, Events } = Matter

interface PlanetMeta {
  tier: number
  /** 出生時間（秒），用於彈跳出生動畫與寬限期 */
  bornAt: number
}

export type GameState = 'ready' | 'playing' | 'over'

export interface GameCallbacks {
  onScore(score: number, best: number): void
  onNext(tier: number): void
  onCombo(multiplier: number): void
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

  private engine = Engine.create()
  private meta = new WeakMap<Matter.Body, PlanetMeta>()
  private particles = new ParticleSystem()
  private stars = makeStars(70)
  private meteors = new ShootingStars()
  private combo = new ComboTracker()
  private time = 0
  private currentTier = pickDropTier()
  private nextDropTier = pickDropTier()
  private aimX = BOARD.width / 2
  private dropCooldown = 0
  private dangerTime = 0
  private shake = 0
  private mergeQueue: Array<{ a: Matter.Body; b: Matter.Body }> = []

  private cb: GameCallbacks

  constructor(cb: GameCallbacks) {
    this.cb = cb
    this.engine.gravity.y = 1.1
    this.buildWalls()
    Events.on(this.engine, 'collisionStart', e => {
      for (const pair of e.pairs) {
        const ma = this.meta.get(pair.bodyA)
        const mb = this.meta.get(pair.bodyB)
        if (ma && mb && ma.tier === mb.tier && ma.tier < MAX_TIER) {
          this.mergeQueue.push({ a: pair.bodyA, b: pair.bodyB })
        }
      }
    })
    this.cb.onNext(this.nextDropTier)
    this.cb.onScore(this.score, this.best)
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

  private spawnPlanet(tier: number, x: number, y: number): Matter.Body {
    const r = TIERS[tier].radius
    const body = Bodies.circle(x, y, r, {
      restitution: 0.25,
      friction: 0.25,
      frictionAir: 0.008,
      density: 0.0012,
    })
    this.meta.set(body, { tier, bornAt: this.time })
    Composite.add(this.engine.world, body)
    return body
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
    this.nextDropTier = pickDropTier()
    this.aim(this.aimX) // 依新星球半徑重新夾住範圍
    this.cb.onNext(this.nextDropTier)
    this.dropCooldown = 0.45
  }

  restart() {
    Composite.clear(this.engine.world, false)
    this.buildWalls()
    this.mergeQueue = []
    this.score = 0
    this.maxTierReached = 0
    this.dangerTime = 0
    this.dropCooldown = 0
    this.state = 'ready'
    this.currentTier = pickDropTier()
    this.nextDropTier = pickDropTier()
    this.combo = new ComboTracker()
    this.cb.onNext(this.nextDropTier)
    this.cb.onScore(this.score, this.best)
  }

  update(dt: number) {
    this.time += dt
    this.dropCooldown = Math.max(0, this.dropCooldown - dt)
    this.shake = Math.max(0, this.shake - dt * 30)

    if (this.state !== 'over') {
      Engine.update(this.engine, Math.min(dt, 1 / 30) * 1000)
      this.processMerges()
      this.checkGameOver(dt)
    }
    this.particles.update(dt)
    this.meteors.update(dt, this.time)
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
      const child = this.spawnPlanet(result, mx, my)
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
      this.particles.float(mx, my - tierDef.radius, `+${gained}${multiplier > 1 ? ` ×${multiplier}` : ''}`, '#FDE047')
      this.shake = Math.min(6, 1 + result * 0.5)
      if (result === MAX_TIER) playFanfare()
      else playMerge(result)

      this.cb.onScore(this.score, this.best)
      this.cb.onCombo(multiplier)
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
      drawAimLine(g, this.aimX)
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
      drawPlanet(g, TIERS[m.tier], body.position.x, body.position.y, body.angle, scale, this.time)
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
