// Classic Perlin noise — drop-in replacement for p5.noise().
// Returns a value in [0, 1] like p5; multi-octave by default to mimic
// p5's default `noiseDetail(4, 0.5)`.

function makePermutation(): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Deterministic shuffle via a LCG so visuals are stable across reloads.
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  return p;
}

const PERM_BASE = makePermutation();
const PERM = new Uint8Array(512);
for (let i = 0; i < 512; i++) PERM[i] = PERM_BASE[i & 255];

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlin(x: number, y: number, z: number): number {
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

/**
 * Multi-octave Perlin noise in [0, 1]. Octaves = 4, persistence = 0.5 to mirror
 * p5's default `noiseDetail(4, 0.5)` which our Flow sketch was implicitly tuned against.
 */
export function noise(x: number, y = 0, z = 0): number {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let i = 0; i < 4; i++) {
    total += perlin(x * freq, y * freq, z * freq) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  // perlin output is roughly [-1, 1]; normalize to [0, 1].
  return (total / maxAmp + 1) * 0.5;
}
