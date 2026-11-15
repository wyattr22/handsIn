export type Step = { at: number; caption: string; target?: string; act: () => void; ready: () => boolean };
/** Monotonic active time; a command is issued once, then its rendered result is observed. */
export class Timeline {
  elapsed = 0;
  index = -1;
  pending = false;
  paused = true;
  finished = false;
  error = '';
  private last = 0;
  private issuedAt = 0;
  constructor(readonly steps: Step[], readonly duration = 25000) {}
  resume(now: number) { if (!this.finished && !this.error) { this.last = now; this.paused = false; } }
  pause(now: number) { if (!this.paused) this.elapsed += Math.max(0, now - this.last); this.last = now; this.paused = true; }
  stop() { this.paused = true; this.finished = true; }
  tick(now: number): number | null {
    if (this.paused || this.finished || this.error) return null;
    this.elapsed += Math.max(0, now - this.last); this.last = now;
    try {
      if (this.elapsed > 30000) throw new Error('Playback was interrupted for too long. Restart for a clean 25-second run.');
      if (this.pending) {
        if (this.steps[this.index].ready()) { this.pending = false; return this.index; }
        if (this.elapsed - this.issuedAt > 2000) throw new Error('The expected screen did not become ready. Restart or take over manually.');
        return null;
      }
      if (this.index + 1 < this.steps.length && this.elapsed >= this.steps[this.index + 1].at) {
        this.index++; this.pending = true; this.issuedAt = this.elapsed;
        this.steps[this.index].act();
      } else if (this.index === this.steps.length - 1 && this.elapsed >= this.duration) {
        this.finished = true; this.paused = true;
      }
    } catch (error) { this.error = error instanceof Error ? error.message : 'Playback interrupted.'; this.paused = true; }
    return null;
  }
}
