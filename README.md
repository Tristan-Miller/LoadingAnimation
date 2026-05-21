# VEED Loading Animation Lab

A prototyping playground for VEED.IO's loading state — four cellular motion
modes layered on a shared grid substrate, with cross-cutting shape and cursor
behaviours. The intent is to flip between combinations quickly and find the
direction that feels right; this is **not** a final integration.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

`npm run build` produces a static bundle in `dist/` — drop it anywhere.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` – `4` | Switch motion tab (Flow / Life / Pulse / Particles) |
| `F` | Toggle fullscreen canvas |
| `H` | Hide / show sidebar |
| `S` | Save current frame as PNG |
| `R` | Start / stop WebM recording |

Shortcuts are ignored while typing in an input.

## The four motion modes

1. **Flow** — 3D Perlin noise field. Cells light up by sampling noise at
   `(col, row, time)`. Threshold slider sweeps from "everything on, smooth
   gradient" through "binary on/off islands".
2. **Life** — Conway's Game of Life on the grid. Auto-reseeds when the
   population collapses or settles. Soft death lets dying cells fade instead
   of snap off.
3. **Pulse** — Sine waves radiating from an origin (centre / cursor /
   drifting). Multiple overlapping waves create interference patterns.
4. **Particles** — A field of particles flows along the perimeter of a shape,
   morphing on a cycle: V → Play → Sparkle → V. Trail length controls how
   long cells stay lit after a particle passes.

## Cross-cutting layers

The shape layer (V / Play / Sparkle / Cycle) and the cursor reaction (Repel /
Attract / Ignite / Distort) can be combined with any motion mode. They live
in the sidebar — sliders apply live.

- **Attract** held >500ms forms a small play triangle around the cursor.
- **Ignite** in Life seeds live cells; in Flow / Pulse / Particles it boosts
  activation; clicking always triggers a stronger burst.
- The shape layer's "Cyclical" mode morphs V → Play → Sparkle in a loop.
  Each mode reacts differently: Life biases its re-seed toward the active
  shape, Flow/Pulse simply overlay it.

## State, persistence, sharing

All sidebar state lives in a single Zustand store (`src/store.ts`). It is
persisted to `localStorage` and mirrored to the URL hash. The Share button in
the top bar copies the current URL — bookmarking or sharing reproduces the
exact configuration. Default config restores on first load.

## File layout

```
src/
  App.tsx                  shell, keyboard shortcuts, URL sync
  store.ts                 Zustand store + URL/localStorage persistence
  shapes.ts                bitmap masks for V, play, sparkle
  sketches/
    base.ts                grid renderer, cursor handling, shape mask
    flow.ts | life.ts | pulse.ts | particles.ts
  components/
    TabBar.tsx | Sidebar.tsx | CanvasMount.tsx | ExportMenu.tsx | Icons.tsx
```

## Adding a 5th mode

1. Drop `src/sketches/whatever.ts` extending `BaseSketch`. Implement
   `update(t)` and `cellActivation(col, row, t)`.
2. Register it in `SKETCH_BY_MODE` in `CanvasMount.tsx`.
3. Add the literal to the `Mode` union in `store.ts`, an entry to `MODES`
   in `TabBar.tsx`, and a panel + entry in `MODE_PANELS` in `Sidebar.tsx`.

The grid render, cursor reactions, shape layer overlay, and palette handling
all live in the base — modes only describe motion.

## Stack

- Vite + React 18 + TypeScript
- p5.js in instance mode
- Zustand for state
- Tailwind for styling

No animation libraries; p5 owns the loop.
