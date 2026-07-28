import Matter from 'matter-js'
import { BOARD, SUN_TIER, TIERS } from './planets'
import { ComboTracker, mergeScore, nextTier, pickDropTier, SUPERNOVA_SCORE } from './logic'
import { discoverNext, topUnlockedTier } from './discovery'
import { ParticleSystem } from './particles'
import {
  BH_PHASE,
  bhProgress,
  drawAimLine,
  drawBackground,
  drawBlackHole,
  drawDangerVignette,
  drawLoseLine,
  drawPlanet,
  drawSupernovaFlash,
  makeStars,
  ShootingStars,
} from './render'
import { playDrop, playFanfare, playGameOver, playMerge, playSupernova } from './audio'
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

interface BlackHoleEvent {
  x: number
  y: number
  /** 已進行秒數（時間軸見 render.ts 的 BH_PHASE；到 total 必定結算，動畫不會卡住） */
  t: number
  /** 相撞的恆星階級（決定爆發粒子的顏色） */
  sourceTier: number
  /** 本次超新星的連鎖倍率（在頂階恆星相撞當下就鎖定） */
  multiplier: number
  /** 吞掉的星球換算分數累計（用 mergeScore 換算，星球越多/越大分數越誇張） */
  absorbed: number
  /** 吞噬期結束時是否已強制清空剩餘星球（只做一次） */
  cleared: boolean
}

export type GameState = 'ready' | 'playing' | 'over'

export interface GameCallbacks {
  onScore(score: number, best: number, maxTier: number): void
  onNext(tier: number): void
  onCombo(multiplier: number): void
  /** 每次合成出一顆新星球時觸發（resultTier=新星球階級、multiplier=當下連鎖倍率） */
  onMerge?(resultTier: number, multiplier: number): void
  /** 頂階恆星相撞爆成超新星（黑洞）時觸發（multiplier=當下連鎖倍率）；不會另外觸發 onMerge */
  onSupernova?(multiplier: number): void
  /** 黑洞結算後發現一顆新的系外恆星時觸發（tier=新恆星階級） */
  onDiscover?(tier: number): void
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
  /** 雙太陽相撞後進行中的黑洞吞噬事件；null＝目前沒有 */
  private blackHole: BlackHoleEvent | null = null
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
        if (ma && mb && ma.tier === mb.tier) {
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
    if (this.state === 'over' || this.dropCooldown > 0 || this.blackHole) return
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
    this.blackHole = null
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
      if (this.blackHole) {
        // 黑洞吞噬中：場面是「過場動畫」，暫停一般合成判定與輸線判定
        this.mergeQueue = []
        this.updateBlackHole(dt)
      } else {
        this.processMerges()
        this.checkGameOver(dt)
      }
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
      const result = nextTier(ma.tier, topUnlockedTier())
      if (result === null) {
        // 頂階恆星相撞：塌陷成黑洞，兩顆恆星先湮滅，開始吞噬全場的過場事件
        merged.add(a)
        merged.add(b)
        const sx = (a.position.x + b.position.x) / 2
        const sy = (a.position.y + b.position.y) / 2
        Composite.remove(this.engine.world, a)
        Composite.remove(this.engine.world, b)

        const multiplier = this.combo.hit(this.time * 1000)
        this.blackHole = { x: sx, y: sy, t: 0, sourceTier: ma.tier, multiplier, absorbed: 0, cleared: false }

        const src = TIERS[ma.tier]
        this.particles.ring(sx, sy, src.color, src.radius * 3)
        this.particles.burst(sx, sy, src.color, 40, 260)
        this.shake = 10
        playSupernova()
        buzz(40)
        // 分數／onSupernova callback 在黑洞吞完全場後才觸發（finishBlackHole），
        // 這樣加分才能算進被吞掉的星球，不會提早報數字。
        continue
      }
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
      if (result >= SUN_TIER) playFanfare() // 合成出太陽或任何恆星都值得號角
      else playMerge(result)
      // 手機觸覺回饋：大星球震久一點（原生走 Capacitor Haptics、含 iOS）
      buzz(8 + result * 3)

      this.cb.onScore(this.score, this.best, this.maxTierReached)
      this.cb.onCombo(multiplier)
      this.cb.onMerge?.(result, multiplier)
    }
    this.mergeQueue = []
  }

  /**
   * 黑洞吞噬過場（時間軸見 render.ts 的 BH_PHASE）：
   * 吞噬期內事件視界擴張、範圍內星球被吸入（換算分數、爆裂消失），
   * 範圍外的被螺旋拉往中心（含切向分量＝漩渦感）、爆裂粒子也被吸進洞裡。
   * 吞噬期結束強制清空剩餘星球；終幕塌縮白閃後結算，動畫必定在有限時間內結束。
   */
  private updateBlackHole(dt: number) {
    const bh = this.blackHole
    if (!bh) return
    bh.t += dt
    const { devour, finale } = bhProgress(bh.t)
    // 吞噬全程持續震動，越吞越劇烈、終幕漸息
    this.shake = Math.max(this.shake, 2 + 7 * devour * (1 - finale))

    if (bh.t < BH_PHASE.devourEnd) {
      // 捕捉半徑二次加速擴張：先醞釀、後半口氣掃過全場
      const captureR = 36 + devour * devour * 900
      const pullStrength = 0.0005 + devour * 0.0035

      for (const body of Composite.allBodies(this.engine.world)) {
        const m = this.meta.get(body)
        if (!m) continue
        const dx = bh.x - body.position.x
        const dy = bh.y - body.position.y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < captureR + TIERS[m.tier].radius * 0.3) {
          this.absorbPlanet(body, m)
          continue
        }
        // 向心 + 切向分量：星球螺旋墜入而非直線撞進去
        const pull = pullStrength * body.mass
        Body.applyForce(body, body.position, {
          x: (dx / dist) * pull + (-dy / dist) * pull * 0.55,
          y: (dy / dist) * pull + (dx / dist) * pull * 0.55,
        })
      }

      // 爆裂粒子也被吸進洞裡：碎屑流成吸積流的一部分
      for (const p of this.particles.particles) {
        const dx = bh.x - p.x
        const dy = bh.y - p.y
        const d = Math.hypot(dx, dy) || 1
        const acc = 1500 * (0.3 + devour)
        p.vx += (dx / d) * acc * dt
        p.vy += ((dy / d) * acc - 400) * dt // -400 抵銷粒子系統本身的重力
      }
    } else if (!bh.cleared) {
      // 吞噬期結束：強制掃尾，保證終幕白閃時場上已空
      bh.cleared = true
      for (const body of Composite.allBodies(this.engine.world)) {
        const m = this.meta.get(body)
        if (m) this.absorbPlanet(body, m)
      }
    }

    if (bh.t >= BH_PHASE.total) this.finishBlackHole()
  }

  /** 一顆星球被黑洞吞入：換算分數累計、爆裂粒子、從場上移除 */
  private absorbPlanet(body: Matter.Body, m: PlanetMeta) {
    const bh = this.blackHole
    if (!bh) return
    bh.absorbed += mergeScore(m.tier)
    this.particles.burst(body.position.x, body.position.y, TIERS[m.tier].color, 6, 90)
    Composite.remove(this.engine.world, body)
  }

  /** 黑洞事件結算：依吞噬量給分、發現下一顆系外恆星（在黑洞原地誕生）、播放收尾特效 */
  private finishBlackHole() {
    const bh = this.blackHole
    if (!bh) return
    // 保險掃尾（正常流程在吞噬期結束就清空了）
    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (m) this.absorbPlanet(body, m)
    }

    const gained = (SUPERNOVA_SCORE + bh.absorbed) * bh.multiplier
    this.score += gained
    if (this.score > this.best) {
      this.best = this.score
      saveBest(this.best)
    }

    this.particles.ring(bh.x, bh.y, '#FFE9B0', 480)
    this.particles.burst(bh.x, bh.y, '#FFE9B0', 60, 340)
    this.particles.float(bh.x, bh.y - 40, `Black hole +${gained}${bh.multiplier > 1 ? ` ×${bh.multiplier}` : ''}`, '#FFD98A')
    this.shake = 14
    playFanfare()
    buzz(60)

    // 發現新恆星：黑洞塌縮的原地誕生一顆前所未見的恆星（跨局永久記錄）
    const newTier = discoverNext()
    if (newTier !== null) {
      const def = TIERS[newTier]
      const sx = Math.min(Math.max(bh.x, def.radius + 4), BOARD.width - def.radius - 4)
      const sy = Math.min(Math.max(bh.y, def.radius + 40), BOARD.height - def.radius - 2)
      this.spawnPlanet(newTier, sx, sy, true)
      this.maxTierReached = Math.max(this.maxTierReached, newTier)
      this.particles.float(sx, sy - def.radius - 18, `⭐ ${def.name} discovered!`, '#FFE9B0')
    }

    this.cb.onScore(this.score, this.best, this.maxTierReached)
    this.cb.onCombo(bh.multiplier)
    // 不呼叫 onMerge：黑洞沒有「合成出的星球」，也避免恆星數被重複計入統計
    this.cb.onSupernova?.(bh.multiplier)
    if (newTier !== null) this.cb.onDiscover?.(newTier)

    this.blackHole = null
    this.dangerTime = 0 // 全場剛被清空，不該立刻又被判定瀕死
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

  /** 直接生成一顆指定階級的星球，供測試與 debug（例：擺兩顆太陽驗證超新星） */
  debugSpawn(tier: number, x: number, y: number) {
    this.spawnPlanet(tier, x, y)
  }

  /** 目前投放中的星球階級（供測試模擬「聰明玩家」決策；UI 用 onNext 拿下一顆） */
  get currentDropTier(): number {
    return this.currentTier
  }

  /** 場上所有星球的座標與階級快照，供測試與 debug（例：模擬貪婪合成策略） */
  get debugPlanets(): Array<{ x: number; y: number; tier: number; r: number }> {
    const out: Array<{ x: number; y: number; tier: number; r: number }> = []
    for (const body of Composite.allBodies(this.engine.world)) {
      const m = this.meta.get(body)
      if (m) out.push({ x: body.position.x, y: body.position.y, tier: m.tier, r: TIERS[m.tier].radius })
    }
    return out
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

    if (this.state !== 'over' && !this.blackHole) {
      // 黑洞過場中不畫瞄準線與預備星球：投放被鎖，畫了只會干擾大場面
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

    if (this.blackHole) {
      // 全視窗吞噬：暗幕壓在星球上、粒子（被吸入的碎屑）疊在暗幕上
      drawBlackHole(g, this.blackHole.x, this.blackHole.y, this.blackHole.t, this.time, this.stars)
    }

    this.particles.draw(g)
    if (this.blackHole) {
      // 終幕白閃疊在最上層：黑洞塌縮、整個宇宙亮起來，然後新恆星誕生
      drawSupernovaFlash(g, this.blackHole.x, this.blackHole.y, this.blackHole.t)
    }
    g.restore()
  }
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
