import { BaseSketch } from './base';
import { useStore } from '../store';

export class PulseSketch extends BaseSketch {
  private driftAngle = 0;
  private driftX = 0;
  private driftY = 0;

  protected update(_t: number): void {
    const cfg = useStore.getState();
    if (cfg.pulse.origin === 'drift') {
      this.driftAngle += this.warpedDtMs() / 6000;
      const r = Math.min(this.width, this.height) * 0.22;
      this.driftX = this.width / 2 + r * Math.cos(this.driftAngle);
      this.driftY = this.height / 2 + r * Math.sin(this.driftAngle * 0.7);
    }
  }

  protected cellActivation(col: number, row: number, t: number): number {
    const cfg = useStore.getState();
    const { waveSpeed, wavelength, waveCount, origin } = cfg.pulse;

    let ox: number, oy: number;
    if (origin === 'cursor' && this.cursor.influence > 0.1) {
      ox = this.cursor.x;
      oy = this.cursor.y;
    } else if (origin === 'drift') {
      ox = this.driftX;
      oy = this.driftY;
    } else {
      ox = this.width / 2;
      oy = this.height / 2;
    }

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
    // Soft falloff at canvas extents so corners don't always blast.
    const maxDist = Math.hypot(this.width, this.height) * 0.55;
    const falloff = Math.max(0, 1 - dist / maxDist);
    out *= 0.35 + 0.65 * falloff;
    return out;
  }
}
