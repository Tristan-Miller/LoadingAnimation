// Hand-authored 16x16 bitmap masks. 1 = on, 0 = off.
// The VEED V is a bold sans-serif V with thick diagonal strokes meeting at the bottom-center.
// Edit these freely — every shape just needs to be 16 rows of 16 chars.

const RAW = {
  v: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0110000000000110',
    '0111000000001110',
    '0011100000011100',
    '0001110000111000',
    '0000111001110000',
    '0000011111100000',
    '0000001111100000',
    '0000000111000000',
    '0000000010000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  play: [
    '0000000000000000',
    '0001100000000000',
    '0001110000000000',
    '0001111000000000',
    '0001111100000000',
    '0001111110000000',
    '0001111111000000',
    '0001111111100000',
    '0001111111110000',
    '0001111111100000',
    '0001111111000000',
    '0001111110000000',
    '0001111100000000',
    '0001111000000000',
    '0001110000000000',
    '0001100000000000',
  ],
  sparkle: [
    '0000000000000000',
    '0000000110000000',
    '0000000110000000',
    '0000000110000000',
    '0000001111000000',
    '0000001111000000',
    '0000011111100000',
    '0011111111111100',
    '0011111111111100',
    '0000011111100000',
    '0000001111000000',
    '0000001111000000',
    '0000000110000000',
    '0000000110000000',
    '0000000110000000',
    '0000000000000000',
  ],
} as const;

export type ShapeKey = keyof typeof RAW;

function parse(rows: readonly string[]): number[][] {
  return rows.map((r) => r.split('').map((c) => (c === '1' ? 1 : 0)));
}

export const SHAPES: Record<ShapeKey, number[][]> = {
  v: parse(RAW.v),
  play: parse(RAW.play),
  sparkle: parse(RAW.sparkle),
};

export const SHAPE_KEYS: ShapeKey[] = ['v', 'play', 'sparkle'];

/**
 * Sample a shape bitmap at normalized [0..1] coords. Returns 0 or 1.
 * Coordinates outside [0,1] return 0.
 */
export function sampleShape(shape: number[][], nx: number, ny: number): number {
  if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) return 0;
  const h = shape.length;
  const w = shape[0].length;
  const bx = Math.min(w - 1, Math.floor(nx * w));
  const by = Math.min(h - 1, Math.floor(ny * h));
  return shape[by][bx];
}

/**
 * Build an ordered list of perimeter points (normalized [0,1]) traversing the
 * outline of `shape`. Uses centroid-relative angle ordering — works for the
 * star-convex shapes we ship.
 */
export function shapeOutline(shape: number[][]): Array<[number, number]> {
  const h = shape.length;
  const w = shape[0].length;
  const onCells: Array<[number, number]> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (shape[y][x] === 1) onCells.push([x, y]);
    }
  }
  if (onCells.length === 0) return [];
  const isOn = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && shape[y][x] === 1;
  const perim: Array<[number, number]> = [];
  for (const [x, y] of onCells) {
    const neighbors = [
      isOn(x - 1, y),
      isOn(x + 1, y),
      isOn(x, y - 1),
      isOn(x, y + 1),
    ];
    if (neighbors.some((n) => !n)) perim.push([x, y]);
  }
  // Centroid
  let cx = 0;
  let cy = 0;
  for (const [x, y] of perim) {
    cx += x;
    cy += y;
  }
  cx /= perim.length;
  cy /= perim.length;
  perim.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return perim.map(([x, y]) => [(x + 0.5) / w, (y + 0.5) / h] as [number, number]);
}

/**
 * VEED V logo as an SVG path. ViewBox is 500 × 367.57 (wider than tall).
 * Used by the canvas-border mask so cells only appear inside the V.
 */
export const V_LOGO_PATH =
  'M499.7,5.62l-134.81,330.66c-3.78,9.25-10.22,17.17-18.52,22.74-8.3,5.57-18.06,8.55-28.06,8.55h-136.24c-9.99,0-19.75-2.97-28.04-8.53-8.29-5.56-14.74-13.47-18.52-22.72L.31,5.62C.05,5-.05,4.33.02,3.67c.07-.67.3-1.3.67-1.86.37-.56.88-1.01,1.47-1.33C2.75.17,3.4,0,4.07,0h136.47C143.94,0,146.99,2.11,148.2,5.3l102.19,272.55L351.76,5.33c.58-1.56,1.62-2.91,2.99-3.87C356.12.51,357.75,0,359.42,0h136.5C498.81,0,500.78,2.94,499.7,5.62Z';
export const V_LOGO_VIEWBOX = { w: 500, h: 367.57 };

/**
 * VEED sparkle icon as an SVG path. ViewBox is 16 × 16. Used as a cell shape.
 */
export const SPARKLE_PATH =
  'M16 8C16.0018 8.23452 15.9305 8.46379 15.7961 8.65592C15.78 8.67887 15.7631 8.70117 15.7455 8.72275C15.4875 9.03864 15.0453 9.09023 14.6429 9.15613C13.6487 9.31894 11.687 9.75043 10.717 10.7209C9.75871 11.6796 9.32635 13.6064 9.15925 14.6113C9.08851 15.0367 9.0309 15.5086 8.687 15.7686C8.67496 15.7777 8.66273 15.7866 8.6503 15.7953C8.45871 15.9286 8.23093 16 7.99756 16C7.7642 16 7.53642 15.9286 7.34483 15.7953C7.33248 15.7867 7.32032 15.7779 7.30836 15.7688C6.96424 15.5087 6.90663 15.0366 6.8359 14.611C6.66885 13.6059 6.23658 11.6789 5.27817 10.7202C4.31977 9.76152 2.39341 9.32912 1.38854 9.16202C0.963073 9.09127 0.491132 9.03363 0.231115 8.68942C0.222073 8.67745 0.213255 8.66529 0.204667 8.65293C0.0714205 8.46129 0 8.23344 0 8C0 7.76656 0.0714205 7.53871 0.204667 7.34707C0.213255 7.33471 0.222073 7.32255 0.231115 7.31058C0.491132 6.96637 0.963073 6.90873 1.38854 6.83798C2.39341 6.67088 4.31977 6.23848 5.27817 5.27978C6.23658 4.32108 6.66885 2.39414 6.8359 1.38896C6.90663 0.963366 6.96424 0.491282 7.30836 0.231185C7.32032 0.22214 7.33248 0.21332 7.34483 0.204729C7.53642 0.0714422 7.7642 0 7.99756 0C8.23093 0 8.45871 0.0714422 8.6503 0.204729C8.66276 0.213399 8.67503 0.222303 8.6871 0.231435C9.0309 0.491492 9.08852 0.963204 9.15926 1.38852C9.32642 2.39358 9.75898 4.32098 10.7177 5.27978C11.6876 6.24985 13.6487 6.68113 14.6427 6.84387C15.0452 6.90977 15.4876 6.96136 15.7456 7.27734C15.7632 7.2989 15.78 7.32116 15.7961 7.34408C15.9305 7.53622 16.0018 7.76548 16 8Z';
export const SPARKLE_VIEWBOX = { w: 16, h: 16 };

/**
 * Pre-render the sparkle into an offscreen canvas at a high resolution so we
 * can stamp it with `ctx.drawImage` per cell — much faster than fill(Path2D)
 * with a per-cell transform.
 */
const STAMP_RES = 64;
const stampCache = new Map<string, HTMLCanvasElement>();
export function getSparkleStamp(color: string): HTMLCanvasElement {
  const cached = stampCache.get(color);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = STAMP_RES;
  c.height = STAMP_RES;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(STAMP_RES / SPARKLE_VIEWBOX.w, STAMP_RES / SPARKLE_VIEWBOX.h);
    ctx.fillStyle = color;
    ctx.fill(new Path2D(SPARKLE_PATH));
  }
  stampCache.set(color, c);
  return c;
}

const outlineCache = new Map<ShapeKey, Array<[number, number]>>();
export function getOutline(key: ShapeKey): Array<[number, number]> {
  let v = outlineCache.get(key);
  if (!v) {
    v = shapeOutline(SHAPES[key]);
    outlineCache.set(key, v);
  }
  return v;
}

/**
 * Rasterized V-logo mask at grid resolution. Values are 0..1 alpha; cells
 * outside the V silhouette are 0. Cached by cols × rows so it's only rebuilt
 * when the grid changes.
 */
let cachedVMask: { cols: number; rows: number; data: Float32Array } | null = null;
export function getVMask(cols: number, rows: number): Float32Array {
  if (cachedVMask && cachedVMask.cols === cols && cachedVMask.rows === rows) {
    return cachedVMask.data;
  }
  // Rasterize a few pixels per cell so edge AA is smoother.
  const ss = 3;
  const W = cols * ss;
  const H = rows * ss;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const out = new Float32Array(cols * rows);
  if (!ctx) {
    cachedVMask = { cols, rows, data: out };
    return out;
  }
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff';

  const aspect = V_LOGO_VIEWBOX.w / V_LOGO_VIEWBOX.h;
  const inset = 0.92;
  let drawW = W * inset;
  let drawH = drawW / aspect;
  if (drawH > H * inset) {
    drawH = H * inset;
    drawW = drawH * aspect;
  }
  const dx = (W - drawW) / 2;
  const dy = (H - drawH) / 2;
  ctx.save();
  ctx.translate(dx, dy);
  ctx.scale(drawW / V_LOGO_VIEWBOX.w, drawH / V_LOGO_VIEWBOX.h);
  const path = new Path2D(V_LOGO_PATH);
  ctx.fill(path);
  ctx.restore();

  const img = ctx.getImageData(0, 0, W, H).data;
  // Downsample by averaging supersample blocks.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = c * ss + sx;
          const y = r * ss + sy;
          sum += img[(y * W + x) * 4 + 3];
        }
      }
      out[r * cols + c] = sum / (ss * ss * 255);
    }
  }

  cachedVMask = { cols, rows, data: out };
  return out;
}
