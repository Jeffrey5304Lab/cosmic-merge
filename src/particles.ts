/** 合成時的粒子爆發 + 浮動分數字 */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export interface FloatingText {
  x: number
  y: number
  text: string
  life: number
  maxLife: number
  color: string
}

export class ParticleSystem {
  particles: Particle[] = []
  texts: FloatingText[] = []

  burst(x: number, y: number, color: string, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const v = speed * (0.4 + Math.random() * 0.6)
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - speed * 0.3,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 4,
        color,
      })
    }
  }

  float(x: number, y: number, text: string, color: string) {
    this.texts.push({ x, y, text, life: 0, maxLife: 1, color })
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 400 * dt // 重力
      p.vx *= 0.98
    }
    this.particles = this.particles.filter(p => p.life < p.maxLife)
    for (const t of this.texts) {
      t.life += dt
      t.y -= 50 * dt
    }
    this.texts = this.texts.filter(t => t.life < t.maxLife)
  }

  draw(g: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife
      g.globalAlpha = alpha
      g.fillStyle = p.color
      g.beginPath()
      g.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
    for (const t of this.texts) {
      const progress = t.life / t.maxLife
      g.globalAlpha = 1 - progress
      g.fillStyle = t.color
      g.font = "bold 22px 'Baloo 2', 'Nunito', sans-serif"
      g.textAlign = 'center'
      g.strokeStyle = 'rgba(0,0,0,0.6)'
      g.lineWidth = 4
      g.strokeText(t.text, t.x, t.y)
      g.fillText(t.text, t.x, t.y)
    }
    g.globalAlpha = 1
  }
}
