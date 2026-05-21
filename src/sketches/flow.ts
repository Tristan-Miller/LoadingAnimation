import { BaseSketch, smoothstep } from './base';
import { useStore } from '../store';

export class FlowSketch extends BaseSketch {
  protected update(_t: number): void {
    // Stateless — everything is computed per cell.
  }

  protected cellActivation(col: number, row: number, t: number): number {
    const { noiseScale, timeSpeed, threshold } = useStore.getState().flow;
    const n = this.noise(col * noiseScale, row * noiseScale, t * timeSpeed);
    if (threshold <= 0.001) return n;
    const edge = 0.08;
    return smoothstep(threshold - edge, threshold + edge, n);
  }
}
