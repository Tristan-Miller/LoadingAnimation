import { create } from 'zustand';

export type Mode = 'flow' | 'life' | 'pulse' | 'particles';
export type CellShape = 'square' | 'circle' | 'sparkle';
export type ShapeLayerMode = 'off' | 'baked' | 'cyclical';
export type ShapeName = 'v' | 'play' | 'sparkle' | 'cycle';
export type CursorReaction =
  | 'off'
  | 'repel'
  | 'attract'
  | 'ignite'
  | 'distort'
  | 'swirl'
  | 'magnify'
  | 'trail';
export type PulseOrigin = 'center' | 'cursor' | 'drift';
export type CanvasShape = 'auto' | 'v';

export interface FlowParams {
  noiseScale: number;
  timeSpeed: number;
  threshold: number;
}
export interface LifeParams {
  stepInterval: number;
  seedDensity: number;
  softDeath: boolean;
  /** Per-cell chance each generation to spontaneously spawn a live cell. */
  spawnRate: number;
}
export interface PulseParams {
  waveSpeed: number;
  wavelength: number;
  waveCount: number;
  origin: PulseOrigin;
}
export interface ParticlesParams {
  cycleSpeed: number;
  particleCount: number;
  trailLength: number;
  shapeOrder: Array<'v' | 'play' | 'sparkle'>;
}
export interface ShapeLayerParams {
  mode: ShapeLayerMode;
  shape: ShapeName;
  morphDuration: number;
  contrast: number;
}
export interface CursorParams {
  reaction: CursorReaction;
  radius: number;
  strength: number;
  falloff: number;
  /** Tint cells lime green where the cursor is interacting with them. */
  tint: boolean;
}
export interface PerformanceParams {
  targetFps: 30 | 60;
  showFps: boolean;
}
export interface RhythmParams {
  /** Master toggle: when off, motion runs flat and the active region has hard edges. */
  breathing: boolean;
  /** Duration of the inhale → hold → exhale phase, in ms. */
  breathPeriod: number;
  /** Pause at zero after each breath, in ms. */
  restMs: number;
  /** 0 = hard rectangular grid, 1 = tight soft circle. */
  edgeSoftness: number;
  /** 0 = clean circle, 1 = irregular organic boundary. */
  edgeNoise: number;
  /** Canvas-shape mask. 'auto' = current rect/circle behaviour, 'v' = V logo silhouette. */
  canvasShape: CanvasShape;
}
export interface ShimmerParams {
  /** Master toggle for the gradient shimmer overlay. */
  enabled: boolean;
  /** 0..1 — how strongly the gradient replaces the foreground colour. */
  intensity: number;
  /** Gradient scroll speed multiplier. */
  speed: number;
  /** When true, intensity is multiplied by the breath curve so the shimmer pulses with the rhythm. */
  followBreath: boolean;
  /** When true, shimmer plays for one active phase then goes dark for `pauseMs`. */
  pauseEnabled: boolean;
  /** Dark window between shimmer sweeps, in ms. Only used when pauseEnabled is true. */
  pauseMs: number;
  /** Fade-in / fade-out duration at the active phase boundaries, in ms. */
  fadeMs: number;
}
export interface BackdropParams {
  /** Rendered size (px) of the animation overlay above the text. */
  scale: number;
  /** Vertical position as a percentage (0-100) of the backdrop image height. */
  yPct: number;
}

export interface Config {
  activeMode: Mode;
  cellShape: CellShape;
  cellSize: number;
  /** Minimum rendered size for any active cell. 0 = no clamp. */
  cellSizeMin: number;
  /** Maximum rendered size for any cell, after cursor scaling. 0 = no clamp. */
  cellSizeMax: number;
  gap: number;
  invert: boolean;
  flow: FlowParams;
  life: LifeParams;
  pulse: PulseParams;
  particles: ParticlesParams;
  shapeLayer: ShapeLayerParams;
  cursor: CursorParams;
  performance: PerformanceParams;
  rhythm: RhythmParams;
  shimmer: ShimmerParams;
  backdrop: BackdropParams;
  fullscreen: boolean;
  sidebarHidden: boolean;
}

export const DEFAULTS: Config = {
  activeMode: 'flow',
  cellShape: 'square',
  cellSize: 14,
  cellSizeMin: 5,
  cellSizeMax: 0,
  gap: 3,
  invert: true,
  flow: { noiseScale: 0.3, timeSpeed: 2, threshold: 0.45 },
  life: { stepInterval: 40, seedDensity: 0.6, softDeath: true, spawnRate: 0.088 },
  pulse: { waveSpeed: 1.2, wavelength: 90, waveCount: 2, origin: 'center' },
  particles: {
    cycleSpeed: 1,
    particleCount: 220,
    trailLength: 14,
    shapeOrder: ['v', 'play', 'sparkle'],
  },
  shapeLayer: { mode: 'off', shape: 'cycle', morphDuration: 1400, contrast: 0.7 },
  cursor: { reaction: 'trail', radius: 600, strength: 1.5, falloff: 0.5, tint: false },
  performance: { targetFps: 60, showFps: false },
  rhythm: {
    breathing: true,
    breathPeriod: 2000,
    restMs: 0,
    edgeSoftness: 0,
    edgeNoise: 0,
    canvasShape: 'v',
  },
  shimmer: { enabled: true, intensity: 1, speed: 0.75, followBreath: true, pauseEnabled: false, pauseMs: 600, fadeMs: 400 },
  backdrop: { scale: 289, yPct: 37 },
  fullscreen: false,
  sidebarHidden: false,
};

/**
 * Bundled starter presets. Seeded into localStorage on first run; users can
 * edit or delete them just like their own saves.
 */
const BUILT_IN_PRESETS: Preset[] = [
  {
    name: 'good v2',
    createdAt: 1779371881555,
    config: {
      activeMode: 'life',
      cellShape: 'square',
      cellSize: 14,
      cellSizeMin: 5,
      cellSizeMax: 0,
      gap: 3,
      invert: true,
      flow: { noiseScale: 0.08, timeSpeed: 0.35, threshold: 0.5 },
      life: { stepInterval: 40, seedDensity: 0.6, softDeath: true, spawnRate: 0.088 },
      pulse: { waveSpeed: 1.2, wavelength: 90, waveCount: 2, origin: 'center' },
      particles: { cycleSpeed: 1, particleCount: 220, trailLength: 14, shapeOrder: ['v', 'play', 'sparkle'] },
      shapeLayer: { mode: 'off', shape: 'cycle', morphDuration: 1400, contrast: 0.7 },
      cursor: { reaction: 'trail', radius: 300, strength: 2, falloff: 0.5, tint: false },
      performance: { targetFps: 60, showFps: false },
      rhythm: { breathing: true, breathPeriod: 3000, restMs: 0, edgeSoftness: 0, edgeNoise: 0, canvasShape: 'v' },
      shimmer: { enabled: true, intensity: 1, speed: 0.75, followBreath: true, pauseEnabled: false, pauseMs: 600, fadeMs: 400 },
    },
  },
  {
    name: 'noise swirl v2',
    createdAt: 1779374085422,
    config: {
      activeMode: 'flow',
      cellShape: 'square',
      cellSize: 14,
      cellSizeMin: 5,
      cellSizeMax: 0,
      gap: 3,
      invert: true,
      flow: { noiseScale: 0.3, timeSpeed: 2, threshold: 0.45 },
      life: { stepInterval: 40, seedDensity: 0.6, softDeath: true, spawnRate: 0.088 },
      pulse: { waveSpeed: 1.2, wavelength: 90, waveCount: 2, origin: 'center' },
      particles: { cycleSpeed: 1, particleCount: 220, trailLength: 14, shapeOrder: ['v', 'play', 'sparkle'] },
      shapeLayer: { mode: 'off', shape: 'cycle', morphDuration: 1400, contrast: 0.7 },
      cursor: { reaction: 'swirl', radius: 201, strength: 0.65, falloff: 1.4, tint: false },
      performance: { targetFps: 60, showFps: false },
      rhythm: { breathing: true, breathPeriod: 2000, restMs: 0, edgeSoftness: 0, edgeNoise: 0, canvasShape: 'v' },
      shimmer: { enabled: true, intensity: 1, speed: 0.75, followBreath: true, pauseEnabled: false, pauseMs: 600, fadeMs: 400 },
    },
  },
  {
    name: 'noise ripple v2',
    createdAt: 1779374112553,
    config: {
      activeMode: 'flow',
      cellShape: 'square',
      cellSize: 14,
      cellSizeMin: 5,
      cellSizeMax: 0,
      gap: 3,
      invert: true,
      flow: { noiseScale: 0.3, timeSpeed: 2, threshold: 0.45 },
      life: { stepInterval: 40, seedDensity: 0.6, softDeath: true, spawnRate: 0.088 },
      pulse: { waveSpeed: 1.2, wavelength: 90, waveCount: 2, origin: 'center' },
      particles: { cycleSpeed: 1, particleCount: 220, trailLength: 14, shapeOrder: ['v', 'play', 'sparkle'] },
      shapeLayer: { mode: 'off', shape: 'cycle', morphDuration: 1400, contrast: 0.7 },
      cursor: { reaction: 'distort', radius: 1200, strength: 1.65, falloff: 3.3, tint: false },
      performance: { targetFps: 60, showFps: false },
      rhythm: { breathing: true, breathPeriod: 2000, restMs: 0, edgeSoftness: 0, edgeNoise: 0, canvasShape: 'v' },
      shimmer: { enabled: true, intensity: 1, speed: 0.75, followBreath: true, pauseEnabled: false, pauseMs: 600, fadeMs: 400 },
    },
  },
  {
    name: 'noise trail v2',
    createdAt: 1779374129525,
    config: {
      activeMode: 'flow',
      cellShape: 'square',
      cellSize: 14,
      cellSizeMin: 5,
      cellSizeMax: 0,
      gap: 3,
      invert: true,
      flow: { noiseScale: 0.3, timeSpeed: 2, threshold: 0.45 },
      life: { stepInterval: 40, seedDensity: 0.6, softDeath: true, spawnRate: 0.088 },
      pulse: { waveSpeed: 1.2, wavelength: 90, waveCount: 2, origin: 'center' },
      particles: { cycleSpeed: 1, particleCount: 220, trailLength: 14, shapeOrder: ['v', 'play', 'sparkle'] },
      shapeLayer: { mode: 'off', shape: 'cycle', morphDuration: 1400, contrast: 0.7 },
      cursor: { reaction: 'trail', radius: 600, strength: 1.5, falloff: 0.5, tint: false },
      performance: { targetFps: 60, showFps: false },
      rhythm: { breathing: true, breathPeriod: 2000, restMs: 0, edgeSoftness: 0, edgeNoise: 0, canvasShape: 'v' },
      shimmer: { enabled: true, intensity: 1, speed: 0.75, followBreath: true, pauseEnabled: false, pauseMs: 600, fadeMs: 400 },
    },
  },
];

export interface Preset {
  name: string;
  createdAt: number;
  config: Partial<Config>;
}

interface Store extends Config {
  setMode: (m: Mode) => void;
  setCellShape: (s: CellShape) => void;
  setCellSize: (n: number) => void;
  setCellSizeMin: (n: number) => void;
  setCellSizeMax: (n: number) => void;
  setGap: (n: number) => void;
  setInvert: (b: boolean) => void;
  setFullscreen: (b: boolean) => void;
  setSidebarHidden: (b: boolean) => void;
  patchFlow: (p: Partial<FlowParams>) => void;
  patchLife: (p: Partial<LifeParams>) => void;
  patchPulse: (p: Partial<PulseParams>) => void;
  patchParticles: (p: Partial<ParticlesParams>) => void;
  patchShapeLayer: (p: Partial<ShapeLayerParams>) => void;
  patchCursor: (p: Partial<CursorParams>) => void;
  patchPerformance: (p: Partial<PerformanceParams>) => void;
  patchRhythm: (p: Partial<RhythmParams>) => void;
  patchShimmer: (p: Partial<ShimmerParams>) => void;
  patchBackdrop: (p: Partial<BackdropParams>) => void;
  resetAll: () => void;
  applyConfig: (c: Partial<Config>) => void;
  presets: Preset[];
  savePreset: (name: string) => void;
  loadPreset: (name: string) => void;
  deletePreset: (name: string) => void;
}

const STORAGE_KEY = 'veed-lab-config-v1';
const PRESETS_KEY = 'veed-lab-presets-v1';

// Old configs stored `breathPeriod` as the *total* cycle (breath + rest).
// We've since split it into separate `breathPeriod` (active) + `restMs`. If we
// load a config that lacks `restMs`, treat the old period as the 80/20 split
// the previous code baked in.
function migrateRhythm(partial: Partial<Config>): Partial<Config> {
  const r = partial.rhythm as (Partial<RhythmParams> & Record<string, unknown>) | undefined;
  if (r && typeof r.breathPeriod === 'number' && !('restMs' in r)) {
    const total = r.breathPeriod;
    r.breathPeriod = Math.round(total * 0.8);
    r.restMs = Math.round(total * 0.2);
  }
  return partial;
}

function loadInitial(): Config {
  // URL hash takes priority over localStorage.
  if (typeof window !== 'undefined') {
    const fromHash = decodeFromHash(window.location.hash);
    if (fromHash) return mergeConfig(DEFAULTS, migrateRhythm(fromHash));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Config>;
        return mergeConfig(DEFAULTS, migrateRhythm(parsed));
      }
    } catch {
      /* ignore */
    }
  }
  return DEFAULTS;
}

function mergeConfig(base: Config, partial: Partial<Config>): Config {
  return {
    ...base,
    ...partial,
    flow: { ...base.flow, ...(partial.flow ?? {}) },
    life: { ...base.life, ...(partial.life ?? {}) },
    pulse: { ...base.pulse, ...(partial.pulse ?? {}) },
    particles: { ...base.particles, ...(partial.particles ?? {}) },
    shapeLayer: { ...base.shapeLayer, ...(partial.shapeLayer ?? {}) },
    cursor: { ...base.cursor, ...(partial.cursor ?? {}) },
    performance: { ...base.performance, ...(partial.performance ?? {}) },
    rhythm: { ...base.rhythm, ...(partial.rhythm ?? {}) },
    shimmer: { ...base.shimmer, ...(partial.shimmer ?? {}) },
    backdrop: { ...base.backdrop, ...(partial.backdrop ?? {}) },
  };
}

function loadPresets(): Preset[] {
  if (typeof window === 'undefined') return [...BUILT_IN_PRESETS];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [...BUILT_IN_PRESETS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Preset[]) : [...BUILT_IN_PRESETS];
  } catch {
    return [...BUILT_IN_PRESETS];
  }
}

function persistPresets(presets: Preset[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    /* ignore quota */
  }
}

export const useStore = create<Store>((set, get) => ({
  ...loadInitial(),
  presets: loadPresets(),
  setMode: (m) => set({ activeMode: m }),
  setCellShape: (s) => set({ cellShape: s }),
  setCellSize: (n) => set({ cellSize: n }),
  setCellSizeMin: (n) => set({ cellSizeMin: n }),
  setCellSizeMax: (n) => set({ cellSizeMax: n }),
  setGap: (n) => set({ gap: n }),
  setInvert: (b) => set({ invert: b }),
  setFullscreen: (b) => set({ fullscreen: b }),
  setSidebarHidden: (b) => set({ sidebarHidden: b }),
  patchFlow: (p) => set({ flow: { ...get().flow, ...p } }),
  patchLife: (p) => set({ life: { ...get().life, ...p } }),
  patchPulse: (p) => set({ pulse: { ...get().pulse, ...p } }),
  patchParticles: (p) => set({ particles: { ...get().particles, ...p } }),
  patchShapeLayer: (p) => set({ shapeLayer: { ...get().shapeLayer, ...p } }),
  patchCursor: (p) => set({ cursor: { ...get().cursor, ...p } }),
  patchPerformance: (p) => set({ performance: { ...get().performance, ...p } }),
  patchRhythm: (p) => set({ rhythm: { ...get().rhythm, ...p } }),
  patchShimmer: (p) => set({ shimmer: { ...get().shimmer, ...p } }),
  patchBackdrop: (p) => set({ backdrop: { ...get().backdrop, ...p } }),
  resetAll: () => set({ ...DEFAULTS, backdrop: get().backdrop }),
  applyConfig: (c) => set(mergeConfig(get(), c)),
  savePreset: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const snapshot = pickAnimationConfig(get());
    const others = get().presets.filter((p) => p.name !== trimmed);
    const next = [{ name: trimmed, createdAt: Date.now(), config: snapshot }, ...others];
    persistPresets(next);
    set({ presets: next });
  },
  loadPreset: (name) => {
    const preset = get().presets.find((p) => p.name === name);
    if (!preset) return;
    set(mergeConfig({ ...DEFAULTS, backdrop: get().backdrop }, preset.config));
  },
  deletePreset: (name) => {
    const next = get().presets.filter((p) => p.name !== name);
    persistPresets(next);
    set({ presets: next });
  },
}));

// Animation-only subset — what travels with presets and share links. Backdrop is
// treated as a view-only setting that should not be overwritten by them.
function pickAnimationConfig(c: Config): Partial<Config> {
  return {
    activeMode: c.activeMode,
    cellShape: c.cellShape,
    cellSize: c.cellSize,
    cellSizeMin: c.cellSizeMin,
    cellSizeMax: c.cellSizeMax,
    gap: c.gap,
    invert: c.invert,
    flow: c.flow,
    life: c.life,
    pulse: c.pulse,
    particles: c.particles,
    shapeLayer: c.shapeLayer,
    cursor: c.cursor,
    performance: c.performance,
    rhythm: c.rhythm,
    shimmer: c.shimmer,
  };
}

// Full persistable subset — used for localStorage so the user's backdrop choice
// survives page reloads, but never written into presets or share URLs.
function pickPersistable(c: Config): Partial<Config> {
  return {
    ...pickAnimationConfig(c),
    backdrop: c.backdrop,
  };
}

export function encodeToHash(c: Config): string {
  const json = JSON.stringify(pickAnimationConfig(c));
  return '#config=' + btoa(unescape(encodeURIComponent(json)));
}

export function decodeFromHash(hash: string): Partial<Config> | null {
  const match = hash.match(/config=([^&]+)/);
  if (!match) return null;
  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    return JSON.parse(json) as Partial<Config>;
  } catch {
    return null;
  }
}

// Subscribe to persist on every change (debounced).
let persistTimer: number | undefined;
if (typeof window !== 'undefined') {
  useStore.subscribe((state) => {
    if (persistTimer) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersistable(state)));
      } catch {
        /* ignore quota */
      }
    }, 200) as unknown as number;
  });
}
