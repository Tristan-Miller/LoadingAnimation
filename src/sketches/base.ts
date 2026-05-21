import { useStore } from '../store';
import { SHAPES, sampleShape, getVMask, getSparkleStamp, type ShapeKey } from '../shapes';
import { noise as perlinNoise } from '../noise';

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// --- Shimmer gradient ----------------------------------------------------
// Three-stop palette cycling continuously: dark teal → teal → lime → ...
const SHIMMER_COLORS = [
  [0x00, 0x4a, 0x52], // #004A52
  [0x31, 0xbd, 0xbf], // #31BDBF
  [0x96, 0xff, 0x1a], // #96FF1A
] as const;

function shimmerColorAt(phase: number): string {
  const p = ((phase % 1) + 1) % 1;
  const idx = p * SHIMMER_COLORS.length;
  const i = Math.floor(idx);
  const local = idx - i;
  const a = SHIMMER_COLORS[i % SHIMMER_COLORS.length];
  const b = SHIMMER_COLORS[(i + 1) % SHIMMER_COLORS.length];
  const r = Math.round(a[0] + (b[0] - a[0]) * local);
  const g = Math.round(a[1] + (b[1] - a[1]) * local);
  const bl = Math.round(a[2] + (b[2] - a[2]) * local);
  return `rgb(${r},${g},${bl})`;
}

export function buildShimmerGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  realMs: number,
  speed: number
): CanvasGradient {
  // Diagonal sweep; one full cycle through the palette every `1 / speed` seconds.
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const T = (realMs / 1000) * speed;
  // Sample the wrapping palette at 9 stop positions for a smooth scroll.
  const STOPS = 8;
  for (let i = 0; i <= STOPS; i++) {
    const stop = i / STOPS;
    grad.addColorStop(stop, shimmerColorAt(stop + T));
  }
  return grad;
}

export interface CursorEffect {
  dx: number;
  dy: number;
  scaleMod: number;
  activationBoost: number;
  /** 0..1 — how strongly the cursor is interacting with this cell. Used to drive tint. */
  tint: number;
}

export abstract class BaseSketch {
  protected canvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  protected width = 0;
  protected height = 0;

  protected cols = 0;
  protected rows = 0;
  protected cellPx = 14;
  protected gap = 2;
  protected step = 16;
  protected offsetX = 0;
  protected offsetY = 0;
  /** Uniform scale from reference grid → actual canvas pixels. */
  protected gridScale = 1;

  protected cursor = {
    x: -9999,
    y: -9999,
    targetX: -9999,
    targetY: -9999,
    inside: false,
    influence: 0,
    moveT: 0,
    idleMs: 0,
  };

  protected ripples: Array<{ x: number; y: number; t: number; strength: number }> = [];
  protected ignites: Array<{ x: number; y: number; t: number; strength: number }> = [];
  protected trail: Array<{ x: number; y: number; t: number }> = [];
  private igniteListeners: Array<(x: number, y: number, isClick: boolean) => void> = [];

  // Warped clock: motion time that pauses + accelerates with the breath curve.
  // Modes should prefer `this.now()` over `this.realMillis()` so motion paces with
  // the breath. Breath itself is computed from real ms so it never stalls.
  private warpedMs = 0;
  private lastWarpedDt = 16;
  protected now(): number {
    return this.warpedMs;
  }
  protected warpedDtMs(): number {
    return this.lastWarpedDt;
  }

  // --- Native render-loop state ------------------------------------------
  private parent: HTMLElement | null = null;
  private startTime = 0;
  private lastFrameTime = 0;
  protected deltaTime = 16;
  private rafId = 0;
  private running = false;
  private targetFps = 60;
  private frameTimes: number[] = [];
  private dpr = 1;

  protected realMillis(): number {
    return performance.now() - this.startTime;
  }
  protected noise(x: number, y = 0, z = 0): number {
    return perlinNoise(x, y, z);
  }

  // Event listener cleanup hooks
  private detachers: Array<() => void> = [];

  mount(parent: HTMLElement) {
    this.parent = parent;
    const cfg = useStore.getState();
    this.targetFps = cfg.performance.targetFps;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    parent.appendChild(canvas);
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio > 1 ? 2 : 1;
    const w = parent.clientWidth || 600;
    const h = parent.clientHeight || 600;
    this.applyCanvasSize(w, h);

    const onEnter = () => {
      this.cursor.inside = true;
    };
    const onLeave = () => {
      this.cursor.inside = false;
    };
    const onMove = (e: MouseEvent) => this.onMouseMove(e);
    const onDown = (e: MouseEvent) => this.onMousePress(e);
    canvas.addEventListener('mouseenter', onEnter);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    this.detachers.push(() => canvas.removeEventListener('mouseenter', onEnter));
    this.detachers.push(() => canvas.removeEventListener('mouseleave', onLeave));
    this.detachers.push(() => canvas.removeEventListener('mousemove', onMove));
    this.detachers.push(() => canvas.removeEventListener('mousedown', onDown));

    this.startTime = performance.now();
    this.lastFrameTime = performance.now();
    this.recomputeGrid();
    this.init();
    this.start();
  }

  unmount() {
    this.stop();
    for (const d of this.detachers) d();
    this.detachers = [];
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.parent = null;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas ?? null;
  }

  setTargetFps(fps: number) {
    this.targetFps = fps;
  }

  private applyCanvasSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    // After resizing the backing store, the transform resets — re-apply DPR scale.
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  protected init() {}

  resize(w: number, h: number) {
    if (!this.canvas) return;
    this.applyCanvasSize(w, h);
    this.recomputeGrid();
    this.onResize();
  }

  protected onResize() {}

  // Reference canvas dimension. Grid density is derived from this constant rather
  // than the actual canvas size, so going fullscreen / resizing the window doesn't
  // change how many cells there are — cells just grow or shrink to fit.
  static readonly REF_DIM = 600;

  recomputeGrid() {
    const cfg = useStore.getState();
    const REF = BaseSketch.REF_DIM;
    const baseStep = cfg.cellSize + cfg.gap;
    this.cols = Math.max(1, Math.floor((REF + cfg.gap) / baseStep));
    this.rows = Math.max(1, Math.floor((REF + cfg.gap) / baseStep));
    // Uniform scale so square cells stay square if the canvas is non-square.
    this.gridScale = Math.min(this.width / REF, this.height / REF);
    this.cellPx = cfg.cellSize * this.gridScale;
    this.gap = cfg.gap * this.gridScale;
    this.step = this.cellPx + this.gap;
    this.offsetX = (this.width - this.cols * this.step + this.gap) / 2;
    this.offsetY = (this.height - this.rows * this.step + this.gap) / 2;
  }

  onIgnite(fn: (x: number, y: number, isClick: boolean) => void) {
    this.igniteListeners.push(fn);
  }

  protected addIgnite(x: number, y: number, isClick: boolean) {
    this.ignites.push({ x, y, t: performance.now(), strength: isClick ? 1.8 : 1.0 });
    if (this.ignites.length > 60) this.ignites.shift();
    for (const fn of this.igniteListeners) fn(x, y, isClick);
  }

  protected onMouseMove(e: MouseEvent) {
    if (!this.cursor.inside) return;
    const cfg = useStore.getState();
    const x = e.offsetX;
    const y = e.offsetY;
    this.cursor.targetX = x;
    this.cursor.targetY = y;
    this.cursor.moveT = performance.now();
    if (cfg.cursor.reaction === 'distort') {
      const last = this.ripples[this.ripples.length - 1];
      if (!last || performance.now() - last.t > 150) {
        this.ripples.push({ x, y, t: performance.now(), strength: 1 });
        if (this.ripples.length > 5) this.ripples.shift();
      }
    }
    if (cfg.cursor.reaction === 'ignite') {
      const last = this.ignites[this.ignites.length - 1];
      if (!last || performance.now() - last.t > 55) {
        this.addIgnite(x, y, false);
      }
    }
    if (cfg.cursor.reaction === 'trail') {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 8 * this.gridScale) {
        this.trail.push({ x, y, t: performance.now() });
        if (this.trail.length > 120) this.trail.shift();
      }
    }
  }

  protected onMousePress(e: MouseEvent) {
    if (!this.cursor.inside) return;
    const cfg = useStore.getState();
    if (cfg.cursor.reaction === 'off') return;
    const x = e.offsetX;
    const y = e.offsetY;
    this.ripples.push({ x, y, t: performance.now(), strength: 2 });
    if (this.ripples.length > 5) this.ripples.shift();
    if (
      cfg.cursor.reaction === 'ignite' ||
      cfg.cursor.reaction === 'attract' ||
      cfg.cursor.reaction === 'repel'
    ) {
      this.addIgnite(x, y, true);
    }
  }

  protected updateCursorInfluence() {
    if (this.cursor.inside) {
      if (this.cursor.influence < 0.01) {
        this.cursor.x = this.cursor.targetX;
        this.cursor.y = this.cursor.targetY;
      }
      this.cursor.x = lerp(this.cursor.x, this.cursor.targetX, 0.35);
      this.cursor.y = lerp(this.cursor.y, this.cursor.targetY, 0.35);
      this.cursor.influence = lerp(this.cursor.influence, 1, 0.2);
      const sinceMove = performance.now() - this.cursor.moveT;
      this.cursor.idleMs = sinceMove;
    } else {
      this.cursor.influence = lerp(this.cursor.influence, 0, 0.07);
      this.cursor.idleMs += this.deltaTime;
    }
  }

  protected getCursorEffect(cx: number, cy: number): CursorEffect {
    const cfg = useStore.getState();
    const r = cfg.cursor.reaction;
    const result: CursorEffect = { dx: 0, dy: 0, scaleMod: 1, activationBoost: 0, tint: 0 };
    if (r === 'off') return result;
    const inf = this.cursor.influence;
    if (
      inf < 0.01 &&
      this.ripples.length === 0 &&
      this.ignites.length === 0 &&
      this.trail.length === 0
    )
      return result;
    // Radius is stored in reference units — scale to actual canvas pixels so the
    // interaction has the same relative reach at any canvas size.
    const radius = cfg.cursor.radius * this.gridScale;
    const strength = cfg.cursor.strength;
    const falloff = cfg.cursor.falloff;

    if ((r === 'repel' || r === 'attract') && inf > 0.01) {
      const dxv = cx - this.cursor.x;
      const dyv = cy - this.cursor.y;
      const dist = Math.hypot(dxv, dyv);
      if (dist < radius && dist > 0.0001) {
        const f = Math.pow(1 - dist / radius, falloff) * strength * inf;
        const ux = dxv / dist;
        const uy = dyv / dist;
        const dir = r === 'repel' ? 1 : -1;
        result.dx += ux * f * radius * 0.4 * dir;
        result.dy += uy * f * radius * 0.4 * dir;
        result.scaleMod *= 1 + f * 0.3;
        if (f > result.tint) result.tint = f;
      }
      if (r === 'attract' && this.cursor.idleMs > 500 && inf > 0.5) {
        const holdT = clamp01((this.cursor.idleMs - 500) / 400);
        const triSize = radius * 1.6;
        const nx = (cx - (this.cursor.x - triSize / 2)) / triSize;
        const ny = (cy - (this.cursor.y - triSize / 2)) / triSize;
        const onTri = sampleShape(SHAPES.play, nx, ny);
        if (onTri > 0)
          result.activationBoost = Math.max(result.activationBoost, onTri * holdT * inf);
      }
    }

    if (r === 'distort') {
      const now = performance.now();
      let scaleBoost = 0;
      for (const rp of this.ripples) {
        const age = (now - rp.t) / 1000;
        if (age > 1.2) continue;
        const reach = age * 380 * rp.strength * this.gridScale;
        const dxv = cx - rp.x;
        const dyv = cy - rp.y;
        const dist = Math.hypot(dxv, dyv);
        if (dist < 0.0001) continue;
        const band = 50 * this.gridScale;
        const proximity = 1 - Math.min(1, Math.abs(dist - reach) / band);
        if (proximity <= 0) continue;
        const decay = 1 - age / 1.2;
        const amount = proximity * decay * rp.strength * 5;
        const ux = dxv / dist;
        const uy = dyv / dist;
        result.dx += ux * amount;
        result.dy += uy * amount;
        scaleBoost += proximity * decay * 0.25;
      }
      result.scaleMod *= 1 + Math.min(0.6, scaleBoost);
      const maxDisp = this.cellPx * 1.4;
      const dispMag = Math.hypot(result.dx, result.dy);
      if (dispMag > maxDisp) {
        const s = maxDisp / dispMag;
        result.dx *= s;
        result.dy *= s;
      }
      if (scaleBoost > result.tint) result.tint = Math.min(1, scaleBoost);
    }

    if (r === 'swirl' && inf > 0.01) {
      const dxv = cx - this.cursor.x;
      const dyv = cy - this.cursor.y;
      const dist = Math.hypot(dxv, dyv);
      if (dist < radius && dist > 0.0001) {
        const f = Math.pow(1 - dist / radius, falloff) * strength * inf;
        const px = -dyv / dist;
        const py = dxv / dist;
        const push = f * radius * 0.55;
        result.dx += px * push;
        result.dy += py * push;
        result.scaleMod *= 1 + f * 0.2;
        const maxDisp = this.cellPx * 1.6;
        const dispMag = Math.hypot(result.dx, result.dy);
        if (dispMag > maxDisp) {
          const s = maxDisp / dispMag;
          result.dx *= s;
          result.dy *= s;
        }
        if (f > result.tint) result.tint = f;
      }
    }

    if (r === 'magnify' && inf > 0.01) {
      const dxv = cx - this.cursor.x;
      const dyv = cy - this.cursor.y;
      const dist = Math.hypot(dxv, dyv);
      if (dist < radius) {
        const f = Math.pow(1 - dist / radius, falloff) * strength * inf;
        result.scaleMod *= 1 + f * 1.6;
        if (f * 0.35 > result.activationBoost) result.activationBoost = f * 0.35;
        if (f > result.tint) result.tint = f;
      }
    }

    if ((r === 'trail' || this.trail.length > 0) && this.trail.length > 0) {
      const now = performance.now();
      const tr = radius * 0.45;
      const tr2 = tr * tr;
      let best = 0;
      for (const tp of this.trail) {
        const age = (now - tp.t) / 1000;
        if (age > 2.4) continue;
        const decay = 1 - age / 2.4;
        const dxv = cx - tp.x;
        const dyv = cy - tp.y;
        const d2 = dxv * dxv + dyv * dyv;
        if (d2 > tr2) continue;
        const dist = Math.sqrt(d2);
        const f = Math.pow(1 - dist / tr, falloff) * decay * strength;
        if (f > best) best = f;
      }
      if (best > result.activationBoost) result.activationBoost = best;
      if (best > result.tint) result.tint = best;
    }

    if (r === 'ignite' || this.ignites.length > 0) {
      const now = performance.now();
      for (const ig of this.ignites) {
        const age = (now - ig.t) / 1000;
        const life = 1.5 * ig.strength;
        if (age > life) continue;
        const decay = 1 - age / life;
        const ir = radius * 0.6 * ig.strength;
        const dxv = cx - ig.x;
        const dyv = cy - ig.y;
        const d2 = dxv * dxv + dyv * dyv;
        if (d2 > ir * ir) continue;
        const dist = Math.sqrt(d2);
        const f = Math.pow(1 - dist / ir, falloff) * decay * strength * ig.strength;
        if (f > result.activationBoost) result.activationBoost = f;
        if (f > result.tint) result.tint = f;
      }
    }

    if (result.tint > 1) result.tint = 1;
    return result;
  }

  protected pruneEffects() {
    const now = performance.now();
    this.ripples = this.ripples.filter((r) => now - r.t < 1400);
    this.ignites = this.ignites.filter((i) => now - i.t < 1800);
    this.trail = this.trail.filter((t) => now - t.t < 2400);
  }

  protected computeBreath(realMs: number): number {
    const cfg = useStore.getState();
    if (!cfg.rhythm.breathing) return 1;
    const breathMs = Math.max(500, cfg.rhythm.breathPeriod);
    const restMs = Math.max(0, cfg.rhythm.restMs);
    const T = breathMs + restMs;
    const ms = ((realMs % T) + T) % T;
    if (ms >= breathMs) return 0; // rest pause
    // Within the breath segment we preserve the original 0.5 / 0.125 / 0.375 ratios.
    const bp = ms / breathMs;
    const inhaleEnd = 0.5;
    const holdEnd = 0.625;
    if (bp < inhaleEnd) {
      const x = bp / inhaleEnd;
      return x * x;
    } else if (bp < holdEnd) {
      return 1;
    } else {
      const x = (bp - holdEnd) / (1 - holdEnd);
      return 1 - x * x;
    }
  }

  protected shapeMaskValue(col: number, row: number, tMs: number): number {
    const cfg = useStore.getState();
    if (cfg.shapeLayer.mode === 'off') return 0;
    const nx = col / this.cols;
    const ny = row / this.rows;
    const D = Math.max(200, cfg.shapeLayer.morphDuration);

    const sample = (k: ShapeKey) => sampleShape(SHAPES[k], nx, ny);

    if (cfg.shapeLayer.shape === 'cycle' || cfg.shapeLayer.mode === 'cyclical') {
      const seq: ShapeKey[] = ['v', 'play', 'sparkle'];
      const segLen = 2 * D;
      const cycleLen = seq.length * segLen;
      const ct = ((tMs % cycleLen) + cycleLen) % cycleLen;
      const segIdx = Math.floor(ct / segLen);
      const segT = (ct - segIdx * segLen) / D;
      const curr = sample(seq[segIdx]);
      if (segT < 1) return curr;
      const next = sample(seq[(segIdx + 1) % seq.length]);
      const m = smoothstep(0, 1, segT - 1);
      return lerp(curr, next, m);
    }

    if (cfg.shapeLayer.shape === 'v') return sample('v');
    if (cfg.shapeLayer.shape === 'play') return sample('play');
    if (cfg.shapeLayer.shape === 'sparkle') return sample('sparkle');
    return 0;
  }

  protected applyShapeLayer(col: number, row: number, activation: number, tMs: number): number {
    const cfg = useStore.getState();
    if (cfg.shapeLayer.mode === 'off') return activation;
    const mask = this.shapeMaskValue(col, row, tMs);
    if (mask <= 0) return activation;
    let contrast = cfg.shapeLayer.contrast;
    if (cfg.shapeLayer.mode === 'cyclical' && cfg.shapeLayer.shape !== 'cycle') {
      const period = Math.max(400, cfg.shapeLayer.morphDuration) * 2;
      const phase = (tMs % period) / period;
      contrast *= 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    }
    return activation + (1 - activation) * mask * contrast;
  }

  protected isInShapeMask(col: number, row: number): boolean {
    return this.shapeMaskValue(col, row, performance.now()) > 0.5;
  }

  protected getShapeAtTime(tMs: number, col: number, row: number): number {
    return this.shapeMaskValue(col, row, tMs);
  }

  // --- Render loop -------------------------------------------------------

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      const interval = 1000 / this.targetFps;
      const elapsed = now - this.lastFrameTime;
      // Allow a small slop so we don't drift below targetFps.
      if (elapsed < interval - 1) return;
      this.deltaTime = elapsed;
      this.lastFrameTime = now;
      this.frameTimes.push(now);
      while (this.frameTimes.length > 60) this.frameTimes.shift();
      this.draw();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private getFps(): number {
    if (this.frameTimes.length < 2) return 0;
    const span = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
    return ((this.frameTimes.length - 1) / span) * 1000;
  }

  draw() {
    const cfg = useStore.getState();
    const ctx = this.ctx;
    this.recomputeGrid();
    this.updateCursorInfluence();
    this.pruneEffects();

    const realMs = this.realMillis();
    const breath = this.computeBreath(realMs);

    const cursorReactive = cfg.cursor.reaction !== 'off';
    const blendOut = cursorReactive ? this.cursor.influence : 0;

    const baseSpeed = cfg.rhythm.breathing ? 0.15 + breath * 1.6 : 1.0;
    const motionSpeed = lerp(baseSpeed, 1.0, blendOut);
    const realDt = this.deltaTime || 16;
    this.lastWarpedDt = realDt * motionSpeed;
    this.warpedMs += this.lastWarpedDt;

    const tMs = this.warpedMs;
    const t = tMs / 1000;
    this.update(t);

    const breathFloor = 0.22;
    const breathRaw = cfg.rhythm.breathing ? breathFloor + (1 - breathFloor) * breath : 1;
    const breathVis = lerp(breathRaw, 1, blendOut);

    const useVMask = cfg.rhythm.canvasShape === 'v';
    const edgeOn = !useVMask && cfg.rhythm.edgeSoftness > 0.001;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const maxR = Math.hypot(halfW, halfH);
    const minDim = Math.min(this.width, this.height);
    const innerR =
      lerp(maxR * 1.05, minDim * 0.34, cfg.rhythm.edgeSoftness) * (0.94 + 0.06 * breath);
    const band = lerp(20, 90, cfg.rhythm.edgeSoftness);
    const noiseOn = cfg.rhythm.edgeNoise > 0.001;
    const noiseScale = 0.12;
    const noiseT = realMs / 6000;
    const noiseAmp = 70 * cfg.rhythm.edgeNoise;
    const vMask = useVMask ? getVMask(this.cols, this.rows) : null;

    const bg = cfg.invert ? '#FFFFFF' : '#121212';
    const fg = cfg.invert ? '#121212' : '#FFFFFF';
    const tintColor = '#96FF1A';
    // Draw onto a transparent canvas — the background is composited *under* the
    // cells at the end so the shimmer overlay only tints the cells, not the bg.
    ctx.clearRect(0, 0, this.width, this.height);

    const half = this.cellPx / 2;
    const shape = cfg.cellShape;
    const tintEnabled = cfg.cursor.tint && cfg.cursor.reaction !== 'off';
    const tintThreshold = 0.08;

    // Per-shape, per-tint batching to minimize fillStyle changes.
    const circlePath = shape === 'circle' ? new Path2D() : null;
    const circleTintPath = shape === 'circle' && tintEnabled ? new Path2D() : null;
    // Squares: collect tinted rects so we can run them in a separate fillStyle pass.
    const tintedRects: number[] = [];
    // Sparkle stamps (lazy — only build if we're using them).
    const sparkleStamp = shape === 'sparkle' ? getSparkleStamp(fg) : null;
    const sparkleTintStamp = shape === 'sparkle' && tintEnabled ? getSparkleStamp(tintColor) : null;

    ctx.fillStyle = fg;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cx = this.offsetX + col * this.step + half;
        const cy = this.offsetY + row * this.step + half;

        let motion = this.cellActivation(col, row, t);
        if (motion < 0) motion = 0;
        else if (motion > 1) motion = 1;

        motion *= breathVis;

        if (edgeOn) {
          const dxv = cx - halfW;
          const dyv = cy - halfH;
          let dist = Math.hypot(dxv, dyv);
          if (noiseOn) {
            const n = perlinNoise(col * noiseScale, row * noiseScale, noiseT) * 2 - 1;
            dist += n * noiseAmp;
          }
          motion *= smoothstep(innerR, innerR - band, dist);
        }

        if (vMask) {
          let m = vMask[row * this.cols + col];
          if (noiseOn && m > 0 && m < 1) {
            const n = perlinNoise(col * noiseScale, row * noiseScale, noiseT) * 2 - 1;
            m = clamp01(m + n * 0.4 * cfg.rhythm.edgeNoise);
          }
          // Hard threshold — a cell is either inside the V or culled. This way
          // cells on the antialiased rim animate with the same intensity as
          // interior cells instead of being permanently dimmed by their AA value.
          if (m < 0.5) continue;
        }

        const cur = this.getCursorEffect(cx, cy);
        let activation = motion;
        if (cur.activationBoost > 0) {
          activation = Math.max(activation, cur.activationBoost);
        }

        activation = this.applyShapeLayer(col, row, activation, tMs);

        // V mask is already a hard gate above — no second AA-dimming pass.

        const hasMin = cfg.cellSizeMin > 0;
        if (!hasMin && activation < 0.02) continue;

        const drawX = cx + cur.dx;
        const drawY = cy + cur.dy;
        let size = this.cellPx * activation * cur.scaleMod;
        // Min/max sliders are in reference units — scale them like cellPx so the
        // visual lower/upper bounds scale with the canvas instead of being absolute.
        const minEff = cfg.cellSizeMin * this.gridScale;
        const maxEff = cfg.cellSizeMax * this.gridScale;
        if (hasMin && size < minEff) size = minEff;
        if (maxEff > 0 && size > maxEff) size = maxEff;
        if (size < 0.5) continue;

        const tinted = tintEnabled && cur.tint > tintThreshold;

        if (shape === 'circle') {
          const r = size / 2;
          const target = tinted ? circleTintPath! : circlePath!;
          target.moveTo(drawX + r, drawY);
          target.arc(drawX, drawY, r, 0, Math.PI * 2);
        } else if (shape === 'sparkle') {
          const stamp = tinted ? sparkleTintStamp! : sparkleStamp!;
          ctx.drawImage(stamp, drawX - size / 2, drawY - size / 2, size, size);
        } else {
          // square
          if (tinted) {
            tintedRects.push(drawX - size / 2, drawY - size / 2, size);
          } else {
            ctx.fillRect(drawX - size / 2, drawY - size / 2, size, size);
          }
        }
      }
    }

    // Flush batched primary-color paths.
    if (circlePath) {
      ctx.fillStyle = fg;
      ctx.fill(circlePath);
    }
    // Flush batched tinted draws.
    if (tintedRects.length > 0) {
      ctx.fillStyle = tintColor;
      for (let i = 0; i < tintedRects.length; i += 3) {
        const s = tintedRects[i + 2];
        ctx.fillRect(tintedRects[i], tintedRects[i + 1], s, s);
      }
    }
    if (circleTintPath) {
      ctx.fillStyle = tintColor;
      ctx.fill(circleTintPath);
    }

    // Shimmer overlay — gradient that paints only where cells exist
    // (uses source-atop on the still-transparent backdrop).
    if (cfg.shimmer.enabled && cfg.shimmer.intensity > 0.001) {
      let intensity = cfg.shimmer.intensity;
      if (cfg.shimmer.followBreath && cfg.rhythm.breathing) {
        intensity *= breath;
      }
      if (intensity > 0.001) {
        const grad = buildShimmerGradient(ctx, this.width, this.height, realMs, cfg.shimmer.speed);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.globalAlpha = intensity;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }

    // Composite background underneath the cells.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    if (cfg.performance.showFps) {
      ctx.fillStyle = '#96FF1A';
      ctx.font = '11px ui-sans-serif, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${this.getFps().toFixed(0)} fps`, 10, this.height - 8);
    }
  }

  protected abstract update(t: number): void;
  protected abstract cellActivation(col: number, row: number, t: number): number;
}
