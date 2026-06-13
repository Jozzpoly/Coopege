export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  nextUint32(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.state = value >>> 0;
    return (value ^ (value >>> 14)) >>> 0;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  snapshot(): number {
    return this.state >>> 0;
  }

  restore(state: number): void {
    if (!Number.isInteger(state) || state < 0 || state > 0xffff_ffff) {
      throw new Error("Stan RNG musi być 32-bitową liczbą całkowitą bez znaku.");
    }
    this.state = state >>> 0;
  }
}
