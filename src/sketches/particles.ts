import { BaseSketch, lerp, smoothstep } from './base';
import { useStore } from '../store';
import { getOutline, type ShapeKey } from '../shapes';

interface Particle {
  s: number;
  speed: number;
  isExtra: boolean;
  life: number;
  x: number;
  y: number;
}

export class ParticlesSketch extends BaseSketch {
  private particles: Particle[] = [];
  private activation: number[][] = [];

  protected init(): void {
    this.initParticles();
    this.initActivation();
    this.onIgnite((x, y, isClick) => {
      const count = isClick ? 24 : 8;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          s: Math.random(),
          speed: 0,
          isExtra: true,
          life: 1,
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
        });
      }
      while (this.particles.length > 1200) {
        const idx = this.particles.findIndex((p) => p.isExtra);
        if (idx >= 0) this.particles.splice(idx, 1);
        else break;
      }
    });
  }

  protected onResize(): void {
    this.initActivation();
  }

  private initParticles() {
    const cfg = useStore.getState();
    this.particles = [];
    for (let i = 0; i < cfg.particles.particleCount; i++) {
      this.particles.push({
        s: i / cfg.particles.particleCount,
        speed: 0.22 + (Math.random() - 0.5) * 0.04,
        isExtra: false,
        life: 1,
        x: 0,
        y: 0,
      });
    }
  }

  private initActivation() {
    this.activation = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
  }

  private ensureActivationSize() {
    if (this.activation.length !== this.rows || (this.activation[0]?.length ?? 0) !== this.cols) {
      this.initActivation();
    }
  }

  private ensureParticleCount() {
    const cfg = useStore.getState();
    const want = cfg.particles.particleCount;
    const baseCount = this.particles.reduce((n, p) => (p.isExtra ? n : n + 1), 0);
    if (baseCount < want) {
      for (let i = baseCount; i < want; i++) {
        this.particles.push({
          s: Math.random(),
          speed: 0.22 + (Math.random() - 0.5) * 0.04,
          isExtra: false,
          life: 1,
          x: 0,
          y: 0,
        });
      }
    } else if (baseCount > want) {
      let toRemove = baseCount - want;
      for (let i = this.particles.length - 1; i >= 0 && toRemove > 0; i--) {
        if (!this.particles[i].isExtra) {
          this.particles.splice(i, 1);
          toRemove--;
        }
      }
    }
  }

  private samplePerimeter(shape: ShapeKey, s: number): [number, number] {
    const outline = getOutline(shape);
    if (outline.length === 0) return [0.5, 0.5];
    const sw = ((s % 1) + 1) % 1;
    const f = sw * outline.length;
    const idx = Math.floor(f) % outline.length;
    const next = (idx + 1) % outline.length;
    const frac = f - Math.floor(f);
    const [x1, y1] = outline[idx];
    const [x2, y2] = outline[next];
    return [lerp(x1, x2, frac), lerp(y1, y2, frac)];
  }

  protected update(_t: number): void {
    this.ensureActivationSize();
    this.ensureParticleCount();

    const cfg = useStore.getState();
    const shapes = cfg.particles.shapeOrder;
    const cycleSpeed = Math.max(0.1, cfg.particles.cycleSpeed);
    const dt = Math.min(0.08, this.warpedDtMs() / 1000);

    // Cycle: each shape gets 8s/cycleSpeed, with last 25% morphing.
    const periodPerShape = 8 / cycleSpeed;
    const cycleLen = shapes.length * periodPerShape;
    const tNow = this.now() / 1000;
    const tCycle = ((tNow % cycleLen) + cycleLen) % cycleLen;
    const shapeIdx = Math.floor(tCycle / periodPerShape) % shapes.length;
    const segT = (tCycle - shapeIdx * periodPerShape) / periodPerShape;
    const transStart = 0.75;
    const mix =
      segT > transStart ? smoothstep(0, 1, (segT - transStart) / (1 - transStart)) : 0;
    const currentShape = shapes[shapeIdx];
    const nextShape = shapes[(shapeIdx + 1) % shapes.length];

    // Inset perimeter slightly so it sits inside the canvas frame.
    const inset = 0.12;
    const mapNorm = (n: number) => inset + n * (1 - 2 * inset);

    // Decay trail.
    const decay = Math.max(0.5, 1 - 1 / Math.max(1, cfg.particles.trailLength));
    for (let r = 0; r < this.rows; r++) {
      const row = this.activation[r];
      for (let c = 0; c < this.cols; c++) row[c] *= decay;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      let nx: number, ny: number;
      let stamp = 0.55;

      if (part.isExtra) {
        part.life -= dt * 0.7;
        if (part.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        part.x += (Math.random() - 0.5) * 5;
        part.y += (Math.random() - 0.5) * 5;
        nx = part.x / this.width;
        ny = part.y / this.height;
        stamp = 0.45 * part.life;
      } else {
        part.s = (part.s + part.speed * dt) % 1;
        const [ax, ay] = this.samplePerimeter(currentShape, part.s);
        const [bx, by] = this.samplePerimeter(nextShape, part.s);
        nx = mapNorm(lerp(ax, bx, mix));
        ny = mapNorm(lerp(ay, by, mix));
        if (mix > 0 && mix < 1) {
          const scatter = Math.sin(mix * Math.PI) * 0.08;
          nx += (Math.random() - 0.5) * scatter;
          ny += (Math.random() - 0.5) * scatter;
        }
      }

      const col = Math.floor(nx * this.cols);
      const row = Math.floor(ny * this.rows);
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        const a = this.activation[row][col] + stamp;
        this.activation[row][col] = a > 1 ? 1 : a;
      }
    }
  }

  protected cellActivation(col: number, row: number, _t: number): number {
    return this.activation[row]?.[col] ?? 0;
  }
}
