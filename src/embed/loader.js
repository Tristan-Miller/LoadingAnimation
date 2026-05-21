// Self-contained VEED loading-animation runtime. No deps, vanilla JS.
//
// Usage (embedded HTML output sets up the global automatically):
//   const handle = window.mountVeedLoader(parentEl, optionalConfigOverrides);
//   handle.stop();
//
// The exported HTML embeds a `CONFIG` global with the user's settings baked in
// before this script runs.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Perlin noise — drop-in replacement for p5.noise (returns [0, 1]).
  // ---------------------------------------------------------------------------
  function makeNoise() {
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    let s = 1337;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      const t = base[i];
      base[i] = base[j];
      base[j] = t;
    }
    const PERM = new Uint8Array(512);
    for (let i = 0; i < 512; i++) PERM[i] = base[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const mix = (a, b, t) => a + (b - a) * t;
    const grad = (hash, x, y, z) => {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    function perlin(x, y, z) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);
      const u = fade(x);
      const v = fade(y);
      const w = fade(z);
      const A = PERM[X] + Y;
      const AA = PERM[A] + Z;
      const AB = PERM[A + 1] + Z;
      const B = PERM[X + 1] + Y;
      const BA = PERM[B] + Z;
      const BB = PERM[B + 1] + Z;
      const v1 = mix(
        mix(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u),
        mix(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u),
        v
      );
      const v2 = mix(
        mix(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u),
        mix(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u),
        v
      );
      return mix(v1, v2, w);
    }
    return function noise(x, y = 0, z = 0) {
      let total = 0, amp = 1, freq = 1, maxAmp = 0;
      for (let i = 0; i < 4; i++) {
        total += perlin(x * freq, y * freq, z * freq) * amp;
        maxAmp += amp;
        amp *= 0.5;
        freq *= 2;
      }
      return (total / maxAmp + 1) * 0.5;
    };
  }
  const noise = makeNoise();

  // ---------------------------------------------------------------------------
  // Shapes & masks.
  // ---------------------------------------------------------------------------
  const V_LOGO_PATH =
    'M499.7,5.62l-134.81,330.66c-3.78,9.25-10.22,17.17-18.52,22.74-8.3,5.57-18.06,8.55-28.06,8.55h-136.24c-9.99,0-19.75-2.97-28.04-8.53-8.29-5.56-14.74-13.47-18.52-22.72L.31,5.62C.05,5-.05,4.33.02,3.67c.07-.67.3-1.3.67-1.86.37-.56.88-1.01,1.47-1.33C2.75.17,3.4,0,4.07,0h136.47C143.94,0,146.99,2.11,148.2,5.3l102.19,272.55L351.76,5.33c.58-1.56,1.62-2.91,2.99-3.87C356.12.51,357.75,0,359.42,0h136.5C498.81,0,500.78,2.94,499.7,5.62Z';
  const V_LOGO_VIEWBOX = { w: 500, h: 367.57 };
  const SPARKLE_PATH =
    'M16 8C16.0018 8.23452 15.9305 8.46379 15.7961 8.65592C15.78 8.67887 15.7631 8.70117 15.7455 8.72275C15.4875 9.03864 15.0453 9.09023 14.6429 9.15613C13.6487 9.31894 11.687 9.75043 10.717 10.7209C9.75871 11.6796 9.32635 13.6064 9.15925 14.6113C9.08851 15.0367 9.0309 15.5086 8.687 15.7686C8.67496 15.7777 8.66273 15.7866 8.6503 15.7953C8.45871 15.9286 8.23093 16 7.99756 16C7.7642 16 7.53642 15.9286 7.34483 15.7953C7.33248 15.7867 7.32032 15.7779 7.30836 15.7688C6.96424 15.5087 6.90663 15.0366 6.8359 14.611C6.66885 13.6059 6.23658 11.6789 5.27817 10.7202C4.31977 9.76152 2.39341 9.32912 1.38854 9.16202C0.963073 9.09127 0.491132 9.03363 0.231115 8.68942C0.222073 8.67745 0.213255 8.66529 0.204667 8.65293C0.0714205 8.46129 0 8.23344 0 8C0 7.76656 0.0714205 7.53871 0.204667 7.34707C0.213255 7.33471 0.222073 7.32255 0.231115 7.31058C0.491132 6.96637 0.963073 6.90873 1.38854 6.83798C2.39341 6.67088 4.31977 6.23848 5.27817 5.27978C6.23658 4.32108 6.66885 2.39414 6.8359 1.38896C6.90663 0.963366 6.96424 0.491282 7.30836 0.231185C7.32032 0.22214 7.33248 0.21332 7.34483 0.204729C7.53642 0.0714422 7.7642 0 7.99756 0C8.23093 0 8.45871 0.0714422 8.6503 0.204729C8.66276 0.213399 8.67503 0.222303 8.6871 0.231435C9.0309 0.491492 9.08852 0.963204 9.15926 1.38852C9.32642 2.39358 9.75898 4.32098 10.7177 5.27978C11.6876 6.24985 13.6487 6.68113 14.6427 6.84387C15.0452 6.90977 15.4876 6.96136 15.7456 7.27734C15.7632 7.2989 15.78 7.32116 15.7961 7.34408C15.9305 7.53622 16.0018 7.76548 16 8Z';

  const RAW_SHAPES = {
    v: [
      '0000000000000000','0000000000000000','0000000000000000',
      '0110000000000110','0111000000001110','0011100000011100',
      '0001110000111000','0000111001110000','0000011111100000',
      '0000001111100000','0000000111000000','0000000010000000',
      '0000000000000000','0000000000000000','0000000000000000','0000000000000000',
    ],
    play: [
      '0000000000000000','0001100000000000','0001110000000000',
      '0001111000000000','0001111100000000','0001111110000000',
      '0001111111000000','0001111111100000','0001111111110000',
      '0001111111100000','0001111111000000','0001111110000000',
      '0001111100000000','0001111000000000','0001110000000000','0001100000000000',
    ],
    sparkle: [
      '0000000000000000','0000000110000000','0000000110000000',
      '0000000110000000','0000001111000000','0000001111000000',
      '0000011111100000','0011111111111100','0011111111111100',
      '0000011111100000','0000001111000000','0000001111000000',
      '0000000110000000','0000000110000000','0000000110000000','0000000000000000',
    ],
  };
  const SHAPES = {};
  for (const k of Object.keys(RAW_SHAPES)) {
    SHAPES[k] = RAW_SHAPES[k].map((r) => r.split('').map((c) => (c === '1' ? 1 : 0)));
  }

  function sampleShape(shape, nx, ny) {
    if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) return 0;
    const h = shape.length, w = shape[0].length;
    const bx = Math.min(w - 1, Math.floor(nx * w));
    const by = Math.min(h - 1, Math.floor(ny * h));
    return shape[by][bx];
  }

  function shapeOutline(shape) {
    const h = shape.length, w = shape[0].length;
    const on = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (shape[y][x]) on.push([x, y]);
    if (!on.length) return [];
    const isOn = (x, y) => x >= 0 && x < w && y >= 0 && y < h && shape[y][x] === 1;
    const perim = [];
    for (const [x, y] of on) {
      const ns = [isOn(x - 1, y), isOn(x + 1, y), isOn(x, y - 1), isOn(x, y + 1)];
      if (ns.some((n) => !n)) perim.push([x, y]);
    }
    let cx = 0, cy = 0;
    for (const [x, y] of perim) { cx += x; cy += y; }
    cx /= perim.length; cy /= perim.length;
    perim.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    return perim.map(([x, y]) => [(x + 0.5) / w, (y + 0.5) / h]);
  }

  const outlineCache = new Map();
  function getOutline(key) {
    let v = outlineCache.get(key);
    if (!v) { v = shapeOutline(SHAPES[key]); outlineCache.set(key, v); }
    return v;
  }

  let cachedVMask = null;
  function getVMask(cols, rows) {
    if (cachedVMask && cachedVMask.cols === cols && cachedVMask.rows === rows) return cachedVMask.data;
    const ss = 3;
    const W = cols * ss, H = rows * ss;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const out = new Float32Array(cols * rows);
    if (!ctx) { cachedVMask = { cols, rows, data: out }; return out; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    const aspect = V_LOGO_VIEWBOX.w / V_LOGO_VIEWBOX.h;
    const inset = 0.92;
    let drawW = W * inset;
    let drawH = drawW / aspect;
    if (drawH > H * inset) { drawH = H * inset; drawW = drawH * aspect; }
    const dx = (W - drawW) / 2, dy = (H - drawH) / 2;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(drawW / V_LOGO_VIEWBOX.w, drawH / V_LOGO_VIEWBOX.h);
    ctx.fill(new Path2D(V_LOGO_PATH));
    ctx.restore();
    const img = ctx.getImageData(0, 0, W, H).data;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
          sum += img[((r * ss + sy) * W + (c * ss + sx)) * 4 + 3];
        }
        out[r * cols + c] = sum / (ss * ss * 255);
      }
    }
    cachedVMask = { cols, rows, data: out };
    return out;
  }

  const STAMP_RES = 64;
  const stampCache = new Map();
  function getSparkleStamp(color) {
    const c = stampCache.get(color);
    if (c) return c;
    const cv = document.createElement('canvas');
    cv.width = STAMP_RES; cv.height = STAMP_RES;
    const ctx = cv.getContext('2d');
    if (ctx) {
      ctx.scale(STAMP_RES / 16, STAMP_RES / 16);
      ctx.fillStyle = color;
      ctx.fill(new Path2D(SPARKLE_PATH));
    }
    stampCache.set(color, cv);
    return cv;
  }

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
  const smoothstep = (e0, e1, x) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  const SHIMMER_COLORS = [[0x00, 0x4a, 0x52], [0x31, 0xbd, 0xbf], [0x96, 0xff, 0x1a]];
  function shimmerColorAt(phase) {
    const p = ((phase % 1) + 1) % 1;
    const idx = p * SHIMMER_COLORS.length;
    const i = Math.floor(idx);
    const local = idx - i;
    const a = SHIMMER_COLORS[i % SHIMMER_COLORS.length];
    const b = SHIMMER_COLORS[(i + 1) % SHIMMER_COLORS.length];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * local)},${Math.round(a[1] + (b[1] - a[1]) * local)},${Math.round(a[2] + (b[2] - a[2]) * local)})`;
  }
  function buildShimmerGradient(ctx, w, h, realMs, speed) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    const T = (realMs / 1000) * speed;
    for (let i = 0; i <= 8; i++) grad.addColorStop(i / 8, shimmerColorAt(i / 8 + T));
    return grad;
  }

  // ---------------------------------------------------------------------------
  // Base sketch.
  // ---------------------------------------------------------------------------
  const REF_DIM = 600;

  class BaseSketch {
    constructor(cfg) {
      this.cfg = cfg;
      this.canvas = null;
      this.ctx = null;
      this.width = 0;
      this.height = 0;
      this.cols = 0; this.rows = 0;
      this.cellPx = 14; this.gap = 2; this.step = 16;
      this.offsetX = 0; this.offsetY = 0;
      this.gridScale = 1;
      this.cursor = { x: -9999, y: -9999, targetX: -9999, targetY: -9999, inside: false, influence: 0, moveT: 0, idleMs: 0 };
      this.ripples = []; this.ignites = []; this.trail = [];
      this.igniteListeners = [];
      this.warpedMs = 0; this.lastWarpedDt = 16;
      this.deltaTime = 16;
      this.startTime = 0; this.lastFrameTime = 0;
      this.rafId = 0; this.running = false;
      this.detachers = [];
      this.dpr = 1;
      this.parent = null;
      this.resizeObserver = null;
    }
    realMillis() { return performance.now() - this.startTime; }
    now() { return this.warpedMs; }
    warpedDtMs() { return this.lastWarpedDt; }
    noise(x, y, z) { return noise(x, y, z); }

    mount(parent) {
      this.parent = parent;
      this.dpr = window.devicePixelRatio > 1 ? 2 : 1;
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      parent.appendChild(canvas);
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      const sync = () => {
        const w = parent.clientWidth || REF_DIM;
        const h = parent.clientHeight || REF_DIM;
        this.applyCanvasSize(w, h);
        this.recomputeGrid();
        this.onResize();
      };
      sync();

      const onEnter = () => { this.cursor.inside = true; };
      const onLeave = () => { this.cursor.inside = false; };
      const onMove = (e) => this.onMouseMove(e);
      const onDown = (e) => this.onMousePress(e);
      canvas.addEventListener('mouseenter', onEnter);
      canvas.addEventListener('mouseleave', onLeave);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mousedown', onDown);
      this.detachers.push(
        () => canvas.removeEventListener('mouseenter', onEnter),
        () => canvas.removeEventListener('mouseleave', onLeave),
        () => canvas.removeEventListener('mousemove', onMove),
        () => canvas.removeEventListener('mousedown', onDown)
      );

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(sync);
        this.resizeObserver.observe(parent);
      }

      this.startTime = performance.now();
      this.lastFrameTime = performance.now();
      this.init();
      this.start();
    }

    unmount() {
      this.stop();
      for (const d of this.detachers) d();
      this.detachers = [];
      if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
      if (this.canvas && this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
      this.parent = null;
    }

    applyCanvasSize(w, h) {
      this.width = w; this.height = h;
      this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    init() {}
    onResize() {}
    update() {}
    cellActivation() { return 0; }

    recomputeGrid() {
      const c = this.cfg;
      const baseStep = c.cellSize + c.gap;
      this.cols = Math.max(1, Math.floor((REF_DIM + c.gap) / baseStep));
      this.rows = Math.max(1, Math.floor((REF_DIM + c.gap) / baseStep));
      this.gridScale = Math.min(this.width / REF_DIM, this.height / REF_DIM);
      this.cellPx = c.cellSize * this.gridScale;
      this.gap = c.gap * this.gridScale;
      this.step = this.cellPx + this.gap;
      this.offsetX = (this.width - this.cols * this.step + this.gap) / 2;
      this.offsetY = (this.height - this.rows * this.step + this.gap) / 2;
    }

    onIgnite(fn) { this.igniteListeners.push(fn); }
    addIgnite(x, y, isClick) {
      this.ignites.push({ x, y, t: performance.now(), strength: isClick ? 1.8 : 1.0 });
      if (this.ignites.length > 60) this.ignites.shift();
      for (const fn of this.igniteListeners) fn(x, y, isClick);
    }

    onMouseMove(e) {
      if (!this.cursor.inside) return;
      const c = this.cfg;
      const x = e.offsetX, y = e.offsetY;
      this.cursor.targetX = x; this.cursor.targetY = y;
      this.cursor.moveT = performance.now();
      if (c.cursor.reaction === 'distort') {
        const last = this.ripples[this.ripples.length - 1];
        if (!last || performance.now() - last.t > 150) {
          this.ripples.push({ x, y, t: performance.now(), strength: 1 });
          if (this.ripples.length > 5) this.ripples.shift();
        }
      }
      if (c.cursor.reaction === 'ignite') {
        const last = this.ignites[this.ignites.length - 1];
        if (!last || performance.now() - last.t > 55) this.addIgnite(x, y, false);
      }
      if (c.cursor.reaction === 'trail') {
        const last = this.trail[this.trail.length - 1];
        if (!last || Math.hypot(x - last.x, y - last.y) > 8 * this.gridScale) {
          this.trail.push({ x, y, t: performance.now() });
          if (this.trail.length > 120) this.trail.shift();
        }
      }
    }

    onMousePress(e) {
      if (!this.cursor.inside) return;
      const c = this.cfg;
      if (c.cursor.reaction === 'off') return;
      const x = e.offsetX, y = e.offsetY;
      this.ripples.push({ x, y, t: performance.now(), strength: 2 });
      if (this.ripples.length > 5) this.ripples.shift();
      if (c.cursor.reaction === 'ignite' || c.cursor.reaction === 'attract' || c.cursor.reaction === 'repel') {
        this.addIgnite(x, y, true);
      }
    }

    updateCursorInfluence() {
      if (this.cursor.inside) {
        if (this.cursor.influence < 0.01) {
          this.cursor.x = this.cursor.targetX; this.cursor.y = this.cursor.targetY;
        }
        this.cursor.x = lerp(this.cursor.x, this.cursor.targetX, 0.35);
        this.cursor.y = lerp(this.cursor.y, this.cursor.targetY, 0.35);
        this.cursor.influence = lerp(this.cursor.influence, 1, 0.2);
        this.cursor.idleMs = performance.now() - this.cursor.moveT;
      } else {
        this.cursor.influence = lerp(this.cursor.influence, 0, 0.07);
        this.cursor.idleMs += this.deltaTime;
      }
    }

    getCursorEffect(cx, cy) {
      const c = this.cfg;
      const r = c.cursor.reaction;
      const result = { dx: 0, dy: 0, scaleMod: 1, activationBoost: 0, tint: 0 };
      if (r === 'off') return result;
      const inf = this.cursor.influence;
      if (inf < 0.01 && !this.ripples.length && !this.ignites.length && !this.trail.length) return result;
      const radius = c.cursor.radius * this.gridScale;
      const strength = c.cursor.strength;
      const falloff = c.cursor.falloff;

      if ((r === 'repel' || r === 'attract') && inf > 0.01) {
        const dxv = cx - this.cursor.x, dyv = cy - this.cursor.y;
        const dist = Math.hypot(dxv, dyv);
        if (dist < radius && dist > 0.0001) {
          const f = Math.pow(1 - dist / radius, falloff) * strength * inf;
          const ux = dxv / dist, uy = dyv / dist;
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
          if (onTri > 0) result.activationBoost = Math.max(result.activationBoost, onTri * holdT * inf);
        }
      }
      if (r === 'distort') {
        const now = performance.now();
        let scaleBoost = 0;
        for (const rp of this.ripples) {
          const age = (now - rp.t) / 1000;
          if (age > 1.2) continue;
          const reach = age * 380 * rp.strength * this.gridScale;
          const dxv = cx - rp.x, dyv = cy - rp.y;
          const dist = Math.hypot(dxv, dyv);
          if (dist < 0.0001) continue;
          const band = 50 * this.gridScale;
          const proximity = 1 - Math.min(1, Math.abs(dist - reach) / band);
          if (proximity <= 0) continue;
          const decay = 1 - age / 1.2;
          const amount = proximity * decay * rp.strength * 5;
          result.dx += (dxv / dist) * amount;
          result.dy += (dyv / dist) * amount;
          scaleBoost += proximity * decay * 0.25;
        }
        result.scaleMod *= 1 + Math.min(0.6, scaleBoost);
        const maxDisp = this.cellPx * 1.4;
        const dispMag = Math.hypot(result.dx, result.dy);
        if (dispMag > maxDisp) {
          const s = maxDisp / dispMag;
          result.dx *= s; result.dy *= s;
        }
        if (scaleBoost > result.tint) result.tint = Math.min(1, scaleBoost);
      }
      if (r === 'swirl' && inf > 0.01) {
        const dxv = cx - this.cursor.x, dyv = cy - this.cursor.y;
        const dist = Math.hypot(dxv, dyv);
        if (dist < radius && dist > 0.0001) {
          const f = Math.pow(1 - dist / radius, falloff) * strength * inf;
          const px = -dyv / dist, py = dxv / dist;
          const push = f * radius * 0.55;
          result.dx += px * push; result.dy += py * push;
          result.scaleMod *= 1 + f * 0.2;
          const maxDisp = this.cellPx * 1.6;
          const dispMag = Math.hypot(result.dx, result.dy);
          if (dispMag > maxDisp) {
            const s = maxDisp / dispMag; result.dx *= s; result.dy *= s;
          }
          if (f > result.tint) result.tint = f;
        }
      }
      if (r === 'magnify' && inf > 0.01) {
        const dxv = cx - this.cursor.x, dyv = cy - this.cursor.y;
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
        const tr = radius * 0.45, tr2 = tr * tr;
        let best = 0;
        for (const tp of this.trail) {
          const age = (now - tp.t) / 1000;
          if (age > 2.4) continue;
          const decay = 1 - age / 2.4;
          const dxv = cx - tp.x, dyv = cy - tp.y;
          const d2 = dxv * dxv + dyv * dyv;
          if (d2 > tr2) continue;
          const f = Math.pow(1 - Math.sqrt(d2) / tr, falloff) * decay * strength;
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
          const dxv = cx - ig.x, dyv = cy - ig.y;
          const d2 = dxv * dxv + dyv * dyv;
          if (d2 > ir * ir) continue;
          const f = Math.pow(1 - Math.sqrt(d2) / ir, falloff) * decay * strength * ig.strength;
          if (f > result.activationBoost) result.activationBoost = f;
          if (f > result.tint) result.tint = f;
        }
      }
      if (result.tint > 1) result.tint = 1;
      return result;
    }

    pruneEffects() {
      const now = performance.now();
      this.ripples = this.ripples.filter((r) => now - r.t < 1400);
      this.ignites = this.ignites.filter((i) => now - i.t < 1800);
      this.trail = this.trail.filter((t) => now - t.t < 2400);
    }

    computeBreath(realMs) {
      const c = this.cfg;
      if (!c.rhythm.breathing) return 1;
      const breathMs = Math.max(500, c.rhythm.breathPeriod);
      const restMs = Math.max(0, c.rhythm.restMs);
      const T = breathMs + restMs;
      const ms = ((realMs % T) + T) % T;
      if (ms >= breathMs) return 0;
      const bp = ms / breathMs;
      if (bp < 0.5) { const x = bp / 0.5; return x * x; }
      if (bp < 0.625) return 1;
      const x = (bp - 0.625) / 0.375;
      return 1 - x * x;
    }

    shapeMaskValue(col, row, tMs) {
      const c = this.cfg;
      if (c.shapeLayer.mode === 'off') return 0;
      const nx = col / this.cols, ny = row / this.rows;
      const D = Math.max(200, c.shapeLayer.morphDuration);
      const sample = (k) => sampleShape(SHAPES[k], nx, ny);
      if (c.shapeLayer.shape === 'cycle' || c.shapeLayer.mode === 'cyclical') {
        const seq = ['v', 'play', 'sparkle'];
        const segLen = 2 * D, cycleLen = seq.length * segLen;
        const ct = ((tMs % cycleLen) + cycleLen) % cycleLen;
        const segIdx = Math.floor(ct / segLen);
        const segT = (ct - segIdx * segLen) / D;
        const curr = sample(seq[segIdx]);
        if (segT < 1) return curr;
        const next = sample(seq[(segIdx + 1) % seq.length]);
        return lerp(curr, next, smoothstep(0, 1, segT - 1));
      }
      if (c.shapeLayer.shape === 'v') return sample('v');
      if (c.shapeLayer.shape === 'play') return sample('play');
      if (c.shapeLayer.shape === 'sparkle') return sample('sparkle');
      return 0;
    }

    applyShapeLayer(col, row, activation, tMs) {
      const c = this.cfg;
      if (c.shapeLayer.mode === 'off') return activation;
      const mask = this.shapeMaskValue(col, row, tMs);
      if (mask <= 0) return activation;
      let contrast = c.shapeLayer.contrast;
      if (c.shapeLayer.mode === 'cyclical' && c.shapeLayer.shape !== 'cycle') {
        const period = Math.max(400, c.shapeLayer.morphDuration) * 2;
        const phase = (tMs % period) / period;
        contrast *= 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      }
      return activation + (1 - activation) * mask * contrast;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastFrameTime = performance.now();
      const tick = (now) => {
        if (!this.running) return;
        this.rafId = requestAnimationFrame(tick);
        const interval = 1000 / (this.cfg.performance && this.cfg.performance.targetFps || 60);
        const elapsed = now - this.lastFrameTime;
        if (elapsed < interval - 1) return;
        this.deltaTime = elapsed;
        this.lastFrameTime = now;
        this.draw();
      };
      this.rafId = requestAnimationFrame(tick);
    }
    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    draw() {
      const c = this.cfg;
      const ctx = this.ctx;
      this.recomputeGrid();
      this.updateCursorInfluence();
      this.pruneEffects();

      const realMs = this.realMillis();
      const breath = this.computeBreath(realMs);
      const cursorReactive = c.cursor.reaction !== 'off';
      const blendOut = cursorReactive ? this.cursor.influence : 0;
      const baseSpeed = c.rhythm.breathing ? 0.15 + breath * 1.6 : 1.0;
      const motionSpeed = lerp(baseSpeed, 1.0, blendOut);
      const realDt = this.deltaTime || 16;
      this.lastWarpedDt = realDt * motionSpeed;
      this.warpedMs += this.lastWarpedDt;

      const tMs = this.warpedMs, t = tMs / 1000;
      this.update(t);

      const breathFloor = 0.22;
      const breathRaw = c.rhythm.breathing ? breathFloor + (1 - breathFloor) * breath : 1;
      const breathVis = lerp(breathRaw, 1, blendOut);

      const useVMask = c.rhythm.canvasShape === 'v';
      const edgeOn = !useVMask && c.rhythm.edgeSoftness > 0.001;
      const halfW = this.width / 2, halfH = this.height / 2;
      const maxR = Math.hypot(halfW, halfH);
      const minDim = Math.min(this.width, this.height);
      const innerR = lerp(maxR * 1.05, minDim * 0.34, c.rhythm.edgeSoftness) * (0.94 + 0.06 * breath);
      const band = lerp(20, 90, c.rhythm.edgeSoftness);
      const noiseOn = c.rhythm.edgeNoise > 0.001;
      const noiseScale = 0.12;
      const noiseT = realMs / 6000;
      const noiseAmp = 70 * c.rhythm.edgeNoise;
      const vMask = useVMask ? getVMask(this.cols, this.rows) : null;

      const bg = c.invert ? '#FFFFFF' : '#121212';
      const fg = c.invert ? '#121212' : '#FFFFFF';
      const tintColor = '#96FF1A';
      ctx.clearRect(0, 0, this.width, this.height);
      const half = this.cellPx / 2;
      const shape = c.cellShape;
      const tintEnabled = c.cursor.tint && c.cursor.reaction !== 'off';
      const tintThreshold = 0.08;
      const circlePath = shape === 'circle' ? new Path2D() : null;
      const circleTintPath = shape === 'circle' && tintEnabled ? new Path2D() : null;
      const tintedRects = [];
      const sparkleStamp = shape === 'sparkle' ? getSparkleStamp(fg) : null;
      const sparkleTintStamp = shape === 'sparkle' && tintEnabled ? getSparkleStamp(tintColor) : null;

      ctx.fillStyle = fg;
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const cx = this.offsetX + col * this.step + half;
          const cy = this.offsetY + row * this.step + half;
          let motion = this.cellActivation(col, row, t);
          if (motion < 0) motion = 0; else if (motion > 1) motion = 1;
          motion *= breathVis;
          if (edgeOn) {
            const dxv = cx - halfW, dyv = cy - halfH;
            let dist = Math.hypot(dxv, dyv);
            if (noiseOn) {
              const n = noise(col * noiseScale, row * noiseScale, noiseT) * 2 - 1;
              dist += n * noiseAmp;
            }
            motion *= smoothstep(innerR, innerR - band, dist);
          }
          if (vMask) {
            let m = vMask[row * this.cols + col];
            if (noiseOn && m > 0 && m < 1) {
              const n = noise(col * noiseScale, row * noiseScale, noiseT) * 2 - 1;
              m = clamp01(m + n * 0.4 * c.rhythm.edgeNoise);
            }
            if (m < 0.5) continue;
          }
          const cur = this.getCursorEffect(cx, cy);
          let activation = motion;
          if (cur.activationBoost > 0) activation = Math.max(activation, cur.activationBoost);
          activation = this.applyShapeLayer(col, row, activation, tMs);
          // V mask is already a hard gate above.
          const hasMin = c.cellSizeMin > 0;
          if (!hasMin && activation < 0.02) continue;
          const drawX = cx + cur.dx, drawY = cy + cur.dy;
          let size = this.cellPx * activation * cur.scaleMod;
          const minEff = c.cellSizeMin * this.gridScale;
          const maxEff = c.cellSizeMax * this.gridScale;
          if (hasMin && size < minEff) size = minEff;
          if (maxEff > 0 && size > maxEff) size = maxEff;
          if (size < 0.5) continue;
          const tinted = tintEnabled && cur.tint > tintThreshold;
          if (shape === 'circle') {
            const r = size / 2;
            const target = tinted ? circleTintPath : circlePath;
            target.moveTo(drawX + r, drawY);
            target.arc(drawX, drawY, r, 0, Math.PI * 2);
          } else if (shape === 'sparkle') {
            const stamp = tinted ? sparkleTintStamp : sparkleStamp;
            ctx.drawImage(stamp, drawX - size / 2, drawY - size / 2, size, size);
          } else {
            if (tinted) tintedRects.push(drawX - size / 2, drawY - size / 2, size);
            else ctx.fillRect(drawX - size / 2, drawY - size / 2, size, size);
          }
        }
      }
      if (circlePath) { ctx.fillStyle = fg; ctx.fill(circlePath); }
      if (tintedRects.length) {
        ctx.fillStyle = tintColor;
        for (let i = 0; i < tintedRects.length; i += 3) {
          const s = tintedRects[i + 2];
          ctx.fillRect(tintedRects[i], tintedRects[i + 1], s, s);
        }
      }
      if (circleTintPath) { ctx.fillStyle = tintColor; ctx.fill(circleTintPath); }

      if (c.shimmer && c.shimmer.enabled && c.shimmer.intensity > 0.001) {
        let intensity = c.shimmer.intensity;
        if (c.shimmer.followBreath && c.rhythm.breathing) intensity *= breath;
        if (intensity > 0.001) {
          const grad = buildShimmerGradient(ctx, this.width, this.height, realMs, c.shimmer.speed);
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.globalAlpha = intensity;
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, this.width, this.height);
          ctx.restore();
        }
      }

      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Modes.
  // ---------------------------------------------------------------------------
  class FlowSketch extends BaseSketch {
    update() {}
    cellActivation(col, row, t) {
      const f = this.cfg.flow;
      const n = noise(col * f.noiseScale, row * f.noiseScale, t * f.timeSpeed);
      if (f.threshold <= 0.001) return n;
      return smoothstep(f.threshold - 0.08, f.threshold + 0.08, n);
    }
  }

  class LifeSketch extends BaseSketch {
    constructor(cfg) {
      super(cfg);
      this.grid = []; this.fade = [];
      this.lastTick = 0; this.recentHashes = [];
    }
    init() {
      this.reseed();
      this.onIgnite((x, y, isClick) => {
        const col = Math.floor((x - this.offsetX) / this.step);
        const row = Math.floor((y - this.offsetY) / this.step);
        const radius = isClick ? 4 : 2;
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          const c = col + dx, r = row + dy;
          if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
          if (Math.random() < 0.65) this.grid[r][c] = true;
        }
      });
    }
    onResize() { this.reseed(); }
    ensureSize() {
      if (this.grid.length !== this.rows || (this.grid[0] && this.grid[0].length || 0) !== this.cols) this.reseed();
    }
    reseed() {
      const cfg = this.cfg;
      const tMs = this.now();
      const density = cfg.life.seedDensity;
      const useMask = cfg.shapeLayer.mode !== 'off';
      this.grid = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          let prob = density;
          if (useMask) prob = Math.min(0.95, density + this.shapeMaskValue(c, r, tMs) * 0.5);
          row.push(Math.random() < prob);
        }
        this.grid.push(row);
      }
      this.fade = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.recentHashes = [];
    }
    hashGrid() {
      let h = 5381;
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        h = ((h << 5) + h + (this.grid[r][c] ? 1 : 0)) | 0;
      }
      return h;
    }
    stepGen() {
      const cfg = this.cfg;
      const spawn = Math.max(0, cfg.life.spawnRate);
      const ng = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const rr = (r + dy + this.rows) % this.rows;
          const cc = (c + dx + this.cols) % this.cols;
          if (this.grid[rr][cc]) n++;
        }
        const alive = this.grid[r][c];
        if (alive && (n === 2 || n === 3)) ng[r][c] = true;
        else if (!alive && n === 3) ng[r][c] = true;
        else if (!alive && spawn > 0 && Math.random() < spawn) ng[r][c] = true;
      }
      if (cfg.life.softDeath) {
        for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] && !ng[r][c]) this.fade[r][c] = 1;
        }
      }
      const h = this.hashGrid();
      this.recentHashes.push(h);
      if (this.recentHashes.length > 24) this.recentHashes.shift();
      if (this.recentHashes.length >= 16) {
        const unique = new Set(this.recentHashes.slice(-16));
        if (unique.size <= 3) { this.grid = ng; this.reseed(); return; }
      }
      this.grid = ng;
    }
    applyCursorToGrid() {
      if (!this.cursor.inside || this.cursor.influence < 0.4) return;
      const cfg = this.cfg;
      const r = cfg.cursor.reaction;
      if (r === 'off' || r === 'distort') return;
      const col = Math.floor((this.cursor.x - this.offsetX) / this.step);
      const row = Math.floor((this.cursor.y - this.offsetY) / this.step);
      const baseStep = cfg.cellSize + cfg.gap;
      const radCells = Math.max(1, Math.round(cfg.cursor.radius / baseStep));
      const rad2 = radCells * radCells;
      const str = cfg.cursor.strength;
      const spawnAt = (c, rr, prob) => {
        if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) return;
        if (this.grid[rr][c]) return;
        if (Math.random() < prob) this.grid[rr][c] = true;
      };
      const killAt = (c, rr, prob) => {
        if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) return;
        if (!this.grid[rr][c]) return;
        if (Math.random() < prob) {
          this.grid[rr][c] = false;
          if (cfg.life.softDeath) this.fade[rr][c] = 1;
        }
      };
      if (r === 'repel') {
        for (let dy = -radCells; dy <= radCells; dy++) for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          killAt(col + dx, row + dy, 0.35 * str * falloff);
        }
      } else if (r === 'attract' || r === 'magnify' || r === 'ignite' || r === 'trail') {
        const density = r === 'magnify' ? 0.18 : r === 'ignite' ? 0.22 : 0.1;
        for (let dy = -radCells; dy <= radCells; dy++) for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          spawnAt(col + dx, row + dy, density * str * falloff);
        }
      } else if (r === 'swirl') {
        const moves = [];
        for (let dy = -radCells; dy <= radCells; dy++) for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2 || d2 < 1) continue;
          const c = col + dx, rr = row + dy;
          if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) continue;
          if (!this.grid[rr][c]) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          if (Math.random() > 0.4 * str * falloff) continue;
          const len = Math.sqrt(d2);
          const ndx = Math.round(-dy / len), ndy = Math.round(dx / len);
          if (ndx === 0 && ndy === 0) continue;
          const nc = c + ndx, nr = rr + ndy;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          if (this.grid[nr][nc]) continue;
          moves.push([c, rr, nc, nr]);
        }
        for (const [c, rr, nc, nr] of moves) { this.grid[rr][c] = false; this.grid[nr][nc] = true; }
      }
    }
    update() {
      this.ensureSize();
      const cfg = this.cfg;
      const now = performance.now();
      if (now - this.lastTick >= cfg.life.stepInterval) {
        this.applyCursorToGrid();
        this.stepGen();
        this.lastTick = now;
      }
      if (cfg.life.softDeath) {
        for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
          if (this.fade[r][c] > 0) {
            this.fade[r][c] *= 0.82;
            if (this.fade[r][c] < 0.03) this.fade[r][c] = 0;
          }
        }
      }
    }
    cellActivation(col, row) {
      if (this.grid[row] && this.grid[row][col]) return 1;
      return (this.fade[row] && this.fade[row][col]) || 0;
    }
  }

  class PulseSketch extends BaseSketch {
    constructor(cfg) {
      super(cfg);
      this.driftAngle = 0; this.driftX = 0; this.driftY = 0;
    }
    update() {
      const cfg = this.cfg;
      if (cfg.pulse.origin === 'drift') {
        this.driftAngle += this.warpedDtMs() / 6000;
        const r = Math.min(this.width, this.height) * 0.22;
        this.driftX = this.width / 2 + r * Math.cos(this.driftAngle);
        this.driftY = this.height / 2 + r * Math.sin(this.driftAngle * 0.7);
      }
    }
    cellActivation(col, row, t) {
      const cfg = this.cfg;
      const { waveSpeed, wavelength, waveCount, origin } = cfg.pulse;
      let ox, oy;
      if (origin === 'cursor' && this.cursor.influence > 0.1) { ox = this.cursor.x; oy = this.cursor.y; }
      else if (origin === 'drift') { ox = this.driftX; oy = this.driftY; }
      else { ox = this.width / 2; oy = this.height / 2; }
      const cx = this.offsetX + col * this.step + this.cellPx / 2;
      const cy = this.offsetY + row * this.step + this.cellPx / 2;
      const dist = Math.hypot(cx - ox, cy - oy);
      let sum = 0;
      for (let i = 0; i < waveCount; i++) {
        const offset = i * 0.35;
        const phase = dist / wavelength - t * waveSpeed + offset;
        const v = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
        sum += v * v;
      }
      let out = sum / waveCount;
      const maxDist = Math.hypot(this.width, this.height) * 0.55;
      const falloff = Math.max(0, 1 - dist / maxDist);
      out *= 0.35 + 0.65 * falloff;
      return out;
    }
  }

  class ParticlesSketch extends BaseSketch {
    constructor(cfg) {
      super(cfg);
      this.particles = []; this.activation = [];
    }
    init() {
      this.initParticles();
      this.initActivation();
      this.onIgnite((x, y, isClick) => {
        const count = isClick ? 24 : 8;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            s: Math.random(), speed: 0, isExtra: true, life: 1,
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
          });
        }
        while (this.particles.length > 1200) {
          const idx = this.particles.findIndex((p) => p.isExtra);
          if (idx >= 0) this.particles.splice(idx, 1); else break;
        }
      });
    }
    onResize() { this.initActivation(); }
    initParticles() {
      const cfg = this.cfg;
      this.particles = [];
      for (let i = 0; i < cfg.particles.particleCount; i++) {
        this.particles.push({
          s: i / cfg.particles.particleCount,
          speed: 0.22 + (Math.random() - 0.5) * 0.04,
          isExtra: false, life: 1, x: 0, y: 0,
        });
      }
    }
    initActivation() {
      this.activation = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    }
    ensureActivationSize() {
      if (this.activation.length !== this.rows || (this.activation[0] && this.activation[0].length || 0) !== this.cols) this.initActivation();
    }
    ensureParticleCount() {
      const cfg = this.cfg;
      const want = cfg.particles.particleCount;
      const baseCount = this.particles.reduce((n, p) => (p.isExtra ? n : n + 1), 0);
      if (baseCount < want) {
        for (let i = baseCount; i < want; i++) {
          this.particles.push({ s: Math.random(), speed: 0.22 + (Math.random() - 0.5) * 0.04, isExtra: false, life: 1, x: 0, y: 0 });
        }
      } else if (baseCount > want) {
        let toRemove = baseCount - want;
        for (let i = this.particles.length - 1; i >= 0 && toRemove > 0; i--) {
          if (!this.particles[i].isExtra) { this.particles.splice(i, 1); toRemove--; }
        }
      }
    }
    samplePerimeter(shape, s) {
      const outline = getOutline(shape);
      if (!outline.length) return [0.5, 0.5];
      const sw = ((s % 1) + 1) % 1;
      const f = sw * outline.length;
      const idx = Math.floor(f) % outline.length;
      const next = (idx + 1) % outline.length;
      const frac = f - Math.floor(f);
      const [x1, y1] = outline[idx];
      const [x2, y2] = outline[next];
      return [lerp(x1, x2, frac), lerp(y1, y2, frac)];
    }
    update() {
      this.ensureActivationSize();
      this.ensureParticleCount();
      const cfg = this.cfg;
      const shapes = cfg.particles.shapeOrder;
      const cycleSpeed = Math.max(0.1, cfg.particles.cycleSpeed);
      const dt = Math.min(0.08, this.warpedDtMs() / 1000);
      const periodPerShape = 8 / cycleSpeed;
      const cycleLen = shapes.length * periodPerShape;
      const tNow = this.now() / 1000;
      const tCycle = ((tNow % cycleLen) + cycleLen) % cycleLen;
      const shapeIdx = Math.floor(tCycle / periodPerShape) % shapes.length;
      const segT = (tCycle - shapeIdx * periodPerShape) / periodPerShape;
      const transStart = 0.75;
      const mix = segT > transStart ? smoothstep(0, 1, (segT - transStart) / (1 - transStart)) : 0;
      const currentShape = shapes[shapeIdx];
      const nextShape = shapes[(shapeIdx + 1) % shapes.length];
      const inset = 0.12;
      const mapNorm = (n) => inset + n * (1 - 2 * inset);
      const decay = Math.max(0.5, 1 - 1 / Math.max(1, cfg.particles.trailLength));
      for (let r = 0; r < this.rows; r++) {
        const row = this.activation[r];
        for (let c = 0; c < this.cols; c++) row[c] *= decay;
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const part = this.particles[i];
        let nx, ny, stamp = 0.55;
        if (part.isExtra) {
          part.life -= dt * 0.7;
          if (part.life <= 0) { this.particles.splice(i, 1); continue; }
          part.x += (Math.random() - 0.5) * 5;
          part.y += (Math.random() - 0.5) * 5;
          nx = part.x / this.width; ny = part.y / this.height;
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
    cellActivation(col, row) {
      return (this.activation[row] && this.activation[row][col]) || 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Public entry point.
  // ---------------------------------------------------------------------------
  const SKETCH_BY_MODE = {
    flow: FlowSketch,
    life: LifeSketch,
    pulse: PulseSketch,
    particles: ParticlesSketch,
  };

  function deepMerge(base, overrides) {
    const out = JSON.parse(JSON.stringify(base));
    if (!overrides) return out;
    for (const key of Object.keys(overrides)) {
      const val = overrides[key];
      if (val && typeof val === 'object' && !Array.isArray(val) && out[key] && typeof out[key] === 'object') {
        Object.assign(out[key], val);
      } else {
        out[key] = val;
      }
    }
    return out;
  }

  function mountVeedLoader(parent, overrides) {
    if (!parent) throw new Error('mountVeedLoader: parent element is required');
    if (typeof CONFIG === 'undefined') throw new Error('CONFIG is not defined');
    const config = deepMerge(CONFIG, overrides || {});
    const SketchClass = SKETCH_BY_MODE[config.activeMode] || LifeSketch;
    const sketch = new SketchClass(config);
    sketch.mount(parent);
    return {
      stop() { sketch.unmount(); },
      patch(partial) { Object.assign(sketch.cfg, deepMerge(sketch.cfg, partial)); },
    };
  }

  window.mountVeedLoader = mountVeedLoader;
})();
