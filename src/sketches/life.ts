import { BaseSketch } from './base';
import { useStore } from '../store';

export class LifeSketch extends BaseSketch {
  private grid: boolean[][] = [];
  private fade: number[][] = [];
  private lastTick = 0;
  private recentHashes: number[] = [];

  protected init(): void {
    this.reseed();
    this.onIgnite((x, y, isClick) => {
      const col = Math.floor((x - this.offsetX) / this.step);
      const row = Math.floor((y - this.offsetY) / this.step);
      const radius = isClick ? 4 : 2;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > radius * radius) continue;
          const c = col + dx;
          const r = row + dy;
          if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
          if (Math.random() < 0.65) this.grid[r][c] = true;
        }
      }
    });
  }

  protected onResize(): void {
    this.reseed();
  }

  private ensureSize() {
    if (
      this.grid.length !== this.rows ||
      (this.grid[0]?.length ?? 0) !== this.cols
    ) {
      this.reseed();
    }
  }

  private reseed() {
    const cfg = useStore.getState();
    const tMs = this.now();
    const density = cfg.life.seedDensity;
    const useMask = cfg.shapeLayer.mode !== 'off';
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < this.cols; c++) {
        let prob = density;
        if (useMask) {
          const m = this.shapeMaskValue(c, r, tMs);
          prob = Math.min(0.95, density + m * 0.5);
        }
        row.push(Math.random() < prob);
      }
      this.grid.push(row);
    }
    this.fade = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.recentHashes = [];
  }

  private hashGrid(): number {
    let h = 5381;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        h = ((h << 5) + h + (this.grid[r][c] ? 1 : 0)) | 0;
      }
    }
    return h;
  }

  private stepGen() {
    const cfg = useStore.getState();
    const spawn = Math.max(0, cfg.life.spawnRate);
    const newGrid: boolean[][] = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(false)
    );
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const rr = (r + dy + this.rows) % this.rows;
            const cc = (c + dx + this.cols) % this.cols;
            if (this.grid[rr][cc]) n++;
          }
        }
        const alive = this.grid[r][c];
        if (alive && (n === 2 || n === 3)) newGrid[r][c] = true;
        else if (!alive && n === 3) newGrid[r][c] = true;
        else if (!alive && spawn > 0 && Math.random() < spawn) newGrid[r][c] = true;
      }
    }

    if (cfg.life.softDeath) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] && !newGrid[r][c]) this.fade[r][c] = 1;
        }
      }
    }

    const h = this.hashGrid();
    this.recentHashes.push(h);
    if (this.recentHashes.length > 24) this.recentHashes.shift();
    if (this.recentHashes.length >= 16) {
      const unique = new Set(this.recentHashes.slice(-16));
      if (unique.size <= 3) {
        this.grid = newGrid;
        this.reseed();
        return;
      }
    }

    this.grid = newGrid;
  }

  private applyCursorToGrid() {
    if (!this.cursor.inside || this.cursor.influence < 0.4) return;
    const cfg = useStore.getState();
    const r = cfg.cursor.reaction;
    if (r === 'off' || r === 'distort') return;
    const col = Math.floor((this.cursor.x - this.offsetX) / this.step);
    const row = Math.floor((this.cursor.y - this.offsetY) / this.step);
    // cursor.radius is in reference units; convert to grid-cell count via the
    // unscaled per-cell step (cellSize + gap) so the kill/spawn radius covers
    // the same number of cells regardless of canvas size.
    const baseStep = cfg.cellSize + cfg.gap;
    const radCells = Math.max(1, Math.round(cfg.cursor.radius / baseStep));
    const rad2 = radCells * radCells;
    const str = cfg.cursor.strength;

    const spawnAt = (c: number, rr: number, prob: number) => {
      if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) return;
      if (this.grid[rr][c]) return;
      if (Math.random() < prob) this.grid[rr][c] = true;
    };
    const killAt = (c: number, rr: number, prob: number) => {
      if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) return;
      if (!this.grid[rr][c]) return;
      if (Math.random() < prob) {
        this.grid[rr][c] = false;
        if (cfg.life.softDeath) this.fade[rr][c] = 1;
      }
    };

    if (r === 'repel') {
      for (let dy = -radCells; dy <= radCells; dy++) {
        for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          killAt(col + dx, row + dy, 0.35 * str * falloff);
        }
      }
    } else if (r === 'attract' || r === 'magnify' || r === 'ignite' || r === 'trail') {
      const density = r === 'magnify' ? 0.18 : r === 'ignite' ? 0.22 : 0.1;
      for (let dy = -radCells; dy <= radCells; dy++) {
        for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          spawnAt(col + dx, row + dy, density * str * falloff);
        }
      }
    } else if (r === 'swirl') {
      // Rotate alive cells tangentially: shift them perpendicular to the cursor radial.
      const moves: Array<[number, number, number, number]> = [];
      for (let dy = -radCells; dy <= radCells; dy++) {
        for (let dx = -radCells; dx <= radCells; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 > rad2 || d2 < 1) continue;
          const c = col + dx;
          const rr = row + dy;
          if (c < 0 || c >= this.cols || rr < 0 || rr >= this.rows) continue;
          if (!this.grid[rr][c]) continue;
          const falloff = 1 - Math.sqrt(d2) / radCells;
          if (Math.random() > 0.4 * str * falloff) continue;
          const len = Math.sqrt(d2);
          const ndx = Math.round(-dy / len);
          const ndy = Math.round(dx / len);
          if (ndx === 0 && ndy === 0) continue;
          const nc = c + ndx;
          const nr = rr + ndy;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          if (this.grid[nr][nc]) continue;
          moves.push([c, rr, nc, nr]);
        }
      }
      for (const [c, rr, nc, nr] of moves) {
        this.grid[rr][c] = false;
        this.grid[nr][nc] = true;
      }
    }
  }

  protected update(_t: number): void {
    this.ensureSize();
    const cfg = useStore.getState();
    // Use real-time millis so the simulation keeps evolving during the breath's
    // rest phase (the warped clock barely advances then, which made Life look frozen).
    const now = this.realMillis();
    if (now - this.lastTick >= cfg.life.stepInterval) {
      this.applyCursorToGrid();
      this.stepGen();
      this.lastTick = now;
    }
    if (cfg.life.softDeath) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.fade[r][c] > 0) {
            this.fade[r][c] *= 0.82;
            if (this.fade[r][c] < 0.03) this.fade[r][c] = 0;
          }
        }
      }
    }
  }

  protected cellActivation(col: number, row: number, _t: number): number {
    if (this.grid[row]?.[col]) return 1;
    return this.fade[row]?.[col] ?? 0;
  }
}
