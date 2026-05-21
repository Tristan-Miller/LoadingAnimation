import loaderSource from './loader.js?raw';
import type { Config } from '../store';

/** Build a self-contained HTML page that runs the user's current animation. */
export function buildEmbedHtml(cfg: Config): string {
  // Strip transient UI flags — the embed has no sidebar / fullscreen toggle.
  const exported = {
    activeMode: cfg.activeMode,
    cellShape: cfg.cellShape,
    cellSize: cfg.cellSize,
    cellSizeMin: cfg.cellSizeMin,
    cellSizeMax: cfg.cellSizeMax,
    gap: cfg.gap,
    invert: cfg.invert,
    flow: cfg.flow,
    life: cfg.life,
    pulse: cfg.pulse,
    particles: cfg.particles,
    shapeLayer: cfg.shapeLayer,
    cursor: cfg.cursor,
    performance: cfg.performance,
    rhythm: cfg.rhythm,
    shimmer: cfg.shimmer,
  };
  const configJson = JSON.stringify(exported, null, 2);
  const bg = cfg.invert ? '#FFFFFF' : '#121212';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VEED Loading Animation</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: ${bg}; }
    body { display: flex; align-items: center; justify-content: center; }
    /* Resize this container to control how big the animation renders. */
    #veed-loader { width: 600px; height: 600px; max-width: 100vw; max-height: 100vh; }
  </style>
</head>
<body>
  <div id="veed-loader"></div>
  <script>
  // Edit any value in CONFIG to tweak the animation without touching the runtime below.
  // To embed in your own page:
  //   1. Copy CONFIG and the IIFE that follows into your page.
  //   2. Add an element to mount into (any size) and call:
  //        const handle = window.mountVeedLoader(myElement);
  //      or pass overrides:
  //        window.mountVeedLoader(myElement, { activeMode: 'pulse' });
  //   3. Later, stop the animation with: handle.stop();
  const CONFIG = ${configJson};
${loaderSource}
  // Auto-mount into the demo container.
  if (typeof window !== 'undefined' && document.getElementById('veed-loader')) {
    window.mountVeedLoader(document.getElementById('veed-loader'));
  }
  </script>
</body>
</html>
`;
}
