export interface FixedClockResult {
  ticks: number;
  alpha: number;
}

export class FixedClock {
  private accumulatorMs = 0;

  constructor(
    readonly tickRate: number,
    readonly maxCatchUpTicks = 8,
  ) {
    if (!Number.isFinite(tickRate) || tickRate <= 0) throw new Error("tickRate musi być dodatni.");
  }

  get tickMs(): number {
    return 1000 / this.tickRate;
  }

  advance(deltaMs: number, tick: () => void): FixedClockResult {
    const safeDelta = Math.max(0, Math.min(deltaMs, this.tickMs * this.maxCatchUpTicks));
    this.accumulatorMs += safeDelta;
    let ticks = 0;
    while (this.accumulatorMs + Number.EPSILON >= this.tickMs && ticks < this.maxCatchUpTicks) {
      tick();
      this.accumulatorMs -= this.tickMs;
      ticks += 1;
    }
    return { ticks, alpha: Math.max(0, Math.min(1, this.accumulatorMs / this.tickMs)) };
  }
}
