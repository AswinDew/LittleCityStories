/** Serializable 32-bit LCG; state zero is valid. */
export class SeededRandom {
  private value: number;
  constructor(state: number) {
    if (!Number.isInteger(state) || state < 0 || state > 0xffffffff) throw new RangeError('Invalid PRNG state');
    this.value = state;
  }
  get state(): number { return this.value; }
  next(): number {
    this.value = (Math.imul(this.value, 1664525) + 1013904223) >>> 0;
    return this.value / 0x100000000;
  }
}
