import { useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { ChevronIcon } from './Icons';

// --- UI primitives -------------------------------------------------------

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] uppercase tracking-widest text-white/50 hover:text-white/80 transition"
      >
        <span>{title}</span>
        <ChevronIcon
          size={10}
          className={open ? 'transition-transform' : 'transition-transform -rotate-90'}
        />
      </button>
      {open && <div className="px-3 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  hardMax,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Upper bound when typing in the value directly. Defaults to max × 10. */
  hardMax?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  const hMax = hardMax ?? max * 10;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const n = parseFloat(draft);
    if (!Number.isNaN(n)) {
      onChange(Math.max(min, Math.min(hMax, n)));
    }
    setEditing(false);
  };

  const overMax = value > max;
  const sliderValue = Math.min(max, value);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{label}</span>
        {editing ? (
          <input
            type="number"
            autoFocus
            value={draft}
            min={min}
            max={hMax}
            step={step}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="w-16 text-right bg-white/10 rounded px-1 py-0 text-white tabular-nums outline-none focus:bg-white/15"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(value.toString());
              setEditing(true);
            }}
            title="Click to type a value past the slider's max"
            className={
              'tabular-nums hover:text-white transition cursor-text ' +
              (overMax ? 'text-[#96FF1A]' : 'text-white/40')
            }
          >
            {fmt ? fmt(value) : value.toString()}
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between text-xs py-1 group"
    >
      <span className="text-white/70 group-hover:text-white/90">{label}</span>
      <span
        className="relative w-8 h-4 rounded-full transition"
        style={{ background: value ? '#96FF1A' : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition"
          style={{ left: value ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  label?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  /** Allow buttons to wrap onto multiple rows when the option set is wide. */
  wrap?: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-white/70">{label}</div>}
      <div
        className={
          'gap-1 p-0.5 bg-white/5 rounded ' +
          (wrap ? 'grid grid-cols-4' : 'flex')
        }
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={
              (wrap ? '' : 'flex-1 ') +
              'text-[11px] py-1 px-1 rounded transition ' +
              (value === opt.value
                ? 'text-black font-medium'
                : 'text-white/60 hover:text-white')
            }
            style={value === opt.value ? { background: '#96FF1A' } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Per-mode panels -----------------------------------------------------

function FlowPanel() {
  const flow = useStore((s) => s.flow);
  const patch = useStore((s) => s.patchFlow);
  return (
    <>
      <Slider
        label="Noise scale"
        value={flow.noiseScale}
        min={0.02}
        max={0.3}
        step={0.005}
        onChange={(v) => patch({ noiseScale: v })}
        fmt={(v) => v.toFixed(3)}
      />
      <Slider
        label="Time speed"
        value={flow.timeSpeed}
        min={0}
        max={2}
        step={0.02}
        onChange={(v) => patch({ timeSpeed: v })}
        fmt={(v) => v.toFixed(2)}
      />
      <Slider
        label="Threshold"
        value={flow.threshold}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => patch({ threshold: v })}
        fmt={(v) => v.toFixed(2)}
      />
    </>
  );
}

function LifePanel() {
  const life = useStore((s) => s.life);
  const patch = useStore((s) => s.patchLife);
  return (
    <>
      <Slider
        label="Step interval"
        value={life.stepInterval}
        min={40}
        max={400}
        step={10}
        onChange={(v) => patch({ stepInterval: v })}
        fmt={(v) => `${v}ms`}
      />
      <Slider
        label="Seed density"
        value={life.seedDensity}
        min={0.1}
        max={0.6}
        step={0.01}
        onChange={(v) => patch({ seedDensity: v })}
        fmt={(v) => v.toFixed(2)}
      />
      <Slider
        label="Spawn rate"
        value={life.spawnRate}
        min={0}
        max={0.02}
        step={0.0005}
        onChange={(v) => patch({ spawnRate: v })}
        fmt={(v) => (v * 100).toFixed(2) + '%'}
      />
      <Toggle
        label="Soft death"
        value={life.softDeath}
        onChange={(v) => patch({ softDeath: v })}
      />
    </>
  );
}

function PulsePanel() {
  const pulse = useStore((s) => s.pulse);
  const patch = useStore((s) => s.patchPulse);
  return (
    <>
      <Slider
        label="Wave speed"
        value={pulse.waveSpeed}
        min={0}
        max={3}
        step={0.05}
        onChange={(v) => patch({ waveSpeed: v })}
        fmt={(v) => v.toFixed(2)}
      />
      <Slider
        label="Wavelength"
        value={pulse.wavelength}
        min={30}
        max={200}
        step={2}
        onChange={(v) => patch({ wavelength: v })}
        fmt={(v) => `${v}px`}
      />
      <Slider
        label="Overlapping waves"
        value={pulse.waveCount}
        min={1}
        max={3}
        step={1}
        onChange={(v) => patch({ waveCount: v })}
      />
      <Segmented
        label="Origin"
        value={pulse.origin}
        options={[
          { value: 'center', label: 'Centre' },
          { value: 'cursor', label: 'Cursor' },
          { value: 'drift', label: 'Drift' },
        ]}
        onChange={(v) => patch({ origin: v })}
      />
    </>
  );
}

function ParticlesPanel() {
  const particles = useStore((s) => s.particles);
  const patch = useStore((s) => s.patchParticles);

  const moveShape = (idx: number, dir: -1 | 1) => {
    const order = [...particles.shapeOrder];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    patch({ shapeOrder: order });
  };

  return (
    <>
      <Slider
        label="Cycle speed"
        value={particles.cycleSpeed}
        min={0.25}
        max={3}
        step={0.05}
        onChange={(v) => patch({ cycleSpeed: v })}
        fmt={(v) => v.toFixed(2) + '×'}
      />
      <Slider
        label="Particle count"
        value={particles.particleCount}
        min={40}
        max={600}
        step={10}
        onChange={(v) => patch({ particleCount: v })}
      />
      <Slider
        label="Trail length"
        value={particles.trailLength}
        min={2}
        max={40}
        step={1}
        onChange={(v) => patch({ trailLength: v })}
      />
      <div className="space-y-1">
        <div className="text-xs text-white/70">Shape order</div>
        <div className="space-y-1">
          {particles.shapeOrder.map((s, i) => (
            <div
              key={s + i}
              className="flex items-center justify-between bg-white/5 rounded px-2 py-1 text-xs"
            >
              <span className="capitalize text-white/80">{s}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => moveShape(i, -1)}
                  disabled={i === 0}
                  className="px-1 text-white/40 hover:text-white disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveShape(i, 1)}
                  disabled={i === particles.shapeOrder.length - 1}
                  className="px-1 text-white/40 hover:text-white disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const MODE_PANELS = {
  flow: { title: 'Flow', Comp: FlowPanel },
  life: { title: 'Life', Comp: LifePanel },
  pulse: { title: 'Pulse', Comp: PulsePanel },
  particles: { title: 'Particles', Comp: ParticlesPanel },
} as const;

// --- Sidebar -------------------------------------------------------------

export function Sidebar() {
  const cellShape = useStore((s) => s.cellShape);
  const cellSize = useStore((s) => s.cellSize);
  const cellSizeMin = useStore((s) => s.cellSizeMin);
  const cellSizeMax = useStore((s) => s.cellSizeMax);
  const gap = useStore((s) => s.gap);
  const invert = useStore((s) => s.invert);
  const setCellShape = useStore((s) => s.setCellShape);
  const setCellSize = useStore((s) => s.setCellSize);
  const setCellSizeMin = useStore((s) => s.setCellSizeMin);
  const setCellSizeMax = useStore((s) => s.setCellSizeMax);
  const setGap = useStore((s) => s.setGap);
  const setInvert = useStore((s) => s.setInvert);

  const activeMode = useStore((s) => s.activeMode);
  const ModePanel = MODE_PANELS[activeMode].Comp;
  const modeTitle = MODE_PANELS[activeMode].title;

  const rhythm = useStore((s) => s.rhythm);
  const patchRhythm = useStore((s) => s.patchRhythm);

  const cursor = useStore((s) => s.cursor);
  const patchCursor = useStore((s) => s.patchCursor);

  const perf = useStore((s) => s.performance);
  const patchPerf = useStore((s) => s.patchPerformance);

  const shimmer = useStore((s) => s.shimmer);
  const patchShimmer = useStore((s) => s.patchShimmer);

  const backdrop = useStore((s) => s.backdrop);
  const patchBackdrop = useStore((s) => s.patchBackdrop);

  const resetAll = useStore((s) => s.resetAll);

  const presets = useStore((s) => s.presets);
  const savePreset = useStore((s) => s.savePreset);
  const loadPreset = useStore((s) => s.loadPreset);
  const deletePreset = useStore((s) => s.deletePreset);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    const name = presetName.trim();
    if (!name) return;
    const exists = presets.some((p) => p.name === name);
    if (exists && !confirm(`Overwrite preset "${name}"?`)) return;
    savePreset(name);
    setPresetName('');
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] border-r border-white/5 overflow-y-auto scrollbar-thin">
      <Section title="Presets">
        <div className="flex gap-1">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="Name…"
            className="flex-1 min-w-0 text-xs bg-white/5 hover:bg-white/10 focus:bg-white/10 rounded px-2 py-1 text-white/90 placeholder:text-white/30 outline-none transition"
          />
          <button
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="text-[11px] px-2 py-1 rounded bg-[#96FF1A] text-black font-medium hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Save
          </button>
        </div>
        {presets.length === 0 ? (
          <div className="text-[11px] text-white/30 italic">
            Save the current settings as a named preset.
          </div>
        ) : (
          <div className="space-y-1">
            {presets.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-1 bg-white/5 rounded text-xs group"
              >
                <button
                  onClick={() => loadPreset(p.name)}
                  className="flex-1 min-w-0 text-left px-2 py-1 text-white/80 hover:text-white truncate"
                  title="Load preset"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete preset "${p.name}"?`)) deletePreset(p.name);
                  }}
                  className="px-2 py-1 text-white/30 hover:text-white/80 transition"
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Backdrop" defaultOpen={false}>
        <Slider
          label="Scale"
          value={backdrop.scale}
          min={40}
          max={400}
          step={1}
          onChange={(v) => patchBackdrop({ scale: v })}
          fmt={(v) => `${v}px`}
        />
        <Slider
          label="Vertical position"
          value={backdrop.yPct}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) => patchBackdrop({ yPct: v })}
          fmt={(v) => `${v.toFixed(1)}%`}
        />
      </Section>

      <Section title="Grid">
        <Segmented
          label="Cell shape"
          value={cellShape}
          options={[
            { value: 'square', label: 'Square' },
            { value: 'circle', label: 'Circle' },
            { value: 'sparkle', label: 'Sparkle' },
          ]}
          onChange={setCellShape}
        />
        <Slider
          label="Cell size"
          value={cellSize}
          min={6}
          max={40}
          onChange={setCellSize}
          fmt={(v) => `${v}px`}
        />
        <Slider
          label="Min size"
          value={cellSizeMin}
          min={0}
          max={20}
          step={0.5}
          onChange={setCellSizeMin}
          fmt={(v) => (v <= 0 ? 'off' : `${v}px`)}
        />
        <Slider
          label="Max size"
          value={cellSizeMax}
          min={0}
          max={60}
          step={0.5}
          onChange={setCellSizeMax}
          fmt={(v) => (v <= 0 ? 'off' : `${v}px`)}
        />
        <Slider label="Gap" value={gap} min={0} max={4} onChange={setGap} fmt={(v) => `${v}px`} />
        <Toggle label="Invert colours" value={invert} onChange={setInvert} />
      </Section>

      <Section title={`Motion · ${modeTitle}`}>
        <ModePanel />
      </Section>

      <Section title="Rhythm">
        <Segmented
          label="Canvas shape"
          value={rhythm.canvasShape}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'v', label: 'V logo' },
          ]}
          onChange={(v) => patchRhythm({ canvasShape: v })}
        />
        <Toggle
          label="Breathing"
          value={rhythm.breathing}
          onChange={(v) => patchRhythm({ breathing: v })}
        />
        <Slider
          label="Breath length"
          value={rhythm.breathPeriod}
          min={800}
          max={6000}
          step={50}
          onChange={(v) => patchRhythm({ breathPeriod: v })}
          fmt={(v) => `${(v / 1000).toFixed(2)}s`}
        />
        <Slider
          label="Pause"
          value={rhythm.restMs}
          min={0}
          max={3000}
          step={25}
          onChange={(v) => patchRhythm({ restMs: v })}
          fmt={(v) => (v <= 0 ? 'none' : `${(v / 1000).toFixed(2)}s`)}
        />
        <Slider
          label="Edge softness"
          value={rhythm.edgeSoftness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => patchRhythm({ edgeSoftness: v })}
          fmt={(v) => v.toFixed(2)}
        />
        <Slider
          label="Edge randomness"
          value={rhythm.edgeNoise}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => patchRhythm({ edgeNoise: v })}
          fmt={(v) => v.toFixed(2)}
        />
      </Section>

      <Section title="Shimmer">
        <Toggle
          label="Enabled"
          value={shimmer.enabled}
          onChange={(v) => patchShimmer({ enabled: v })}
        />
        <Slider
          label="Intensity"
          value={shimmer.intensity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => patchShimmer({ intensity: v })}
          fmt={(v) => v.toFixed(2)}
        />
        <Slider
          label="Speed"
          value={shimmer.speed}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => patchShimmer({ speed: v })}
          fmt={(v) => v.toFixed(2) + '×'}
        />
        <Toggle
          label="Pulse with breath"
          value={shimmer.followBreath}
          onChange={(v) => patchShimmer({ followBreath: v })}
        />
        <Toggle
          label="Pause between sweeps"
          value={shimmer.pauseEnabled}
          onChange={(v) => patchShimmer({ pauseEnabled: v })}
        />
        <Slider
          label="Pause duration"
          value={shimmer.pauseMs}
          min={0}
          max={3000}
          step={25}
          onChange={(v) => patchShimmer({ pauseMs: v })}
          fmt={(v) => (v <= 0 ? 'none' : `${(v / 1000).toFixed(2)}s`)}
        />
        <Slider
          label="Fade"
          value={shimmer.fadeMs}
          min={0}
          max={1000}
          step={10}
          onChange={(v) => patchShimmer({ fadeMs: v })}
          fmt={(v) => (v <= 0 ? 'hard' : `${(v / 1000).toFixed(2)}s`)}
        />
      </Section>

      <Section title="Cursor">
        <Segmented
          label="Reaction"
          value={cursor.reaction}
          wrap
          options={[
            { value: 'off', label: 'Off' },
            { value: 'repel', label: 'Repel' },
            { value: 'attract', label: 'Attract' },
            { value: 'ignite', label: 'Ignite' },
            { value: 'distort', label: 'Distort' },
            { value: 'swirl', label: 'Swirl' },
            { value: 'magnify', label: 'Magnify' },
            { value: 'trail', label: 'Trail' },
          ]}
          onChange={(v) => patchCursor({ reaction: v })}
        />
        <Slider
          label="Radius"
          value={cursor.radius}
          min={20}
          max={240}
          onChange={(v) => patchCursor({ radius: v })}
          fmt={(v) => `${v}px`}
        />
        <Slider
          label="Strength"
          value={cursor.strength}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => patchCursor({ strength: v })}
          fmt={(v) => v.toFixed(2)}
        />
        <Slider
          label="Falloff"
          value={cursor.falloff}
          min={0.5}
          max={4}
          step={0.1}
          onChange={(v) => patchCursor({ falloff: v })}
          fmt={(v) => v.toFixed(1)}
        />
        <Toggle
          label="Lime tint on hover"
          value={cursor.tint}
          onChange={(v) => patchCursor({ tint: v })}
        />
      </Section>

      <Section title="Performance" defaultOpen={false}>
        <Segmented
          label="Target FPS"
          value={String(perf.targetFps) as '30' | '60'}
          options={[
            { value: '30', label: '30' },
            { value: '60', label: '60' },
          ]}
          onChange={(v) => patchPerf({ targetFps: (v === '30' ? 30 : 60) as 30 | 60 })}
        />
        <Toggle
          label="Show FPS counter"
          value={perf.showFps}
          onChange={(v) => patchPerf({ showFps: v })}
        />
        <button
          onClick={resetAll}
          className="mt-2 w-full py-1.5 text-[11px] text-white/60 hover:text-white border border-white/10 rounded hover:bg-white/5 transition"
        >
          Reset all to defaults
        </button>
      </Section>
    </div>
  );
}
