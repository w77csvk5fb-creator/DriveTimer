/**
 * シミュレーションモード用の仮想時計。
 * simNow = simStart + 実経過時間 × speedMultiplier
 * UIティッカー・再計算ティッカーは実時間のまま動かし、内部で読む「現在時刻」だけを
 * このクロック経由の値に置き換えることで任意の速度倍率(SIMULATION_SPEED_MULTIPLIERS参照)を実現する。
 */
export interface SimClockOptions {
  readonly simStart: Date;
  readonly speedMultiplier: number;
  /** テスト用に実時間の供給元を差し替えられるようにする */
  readonly nowProvider?: () => number;
}

export class SimClock {
  private readonly realStartMs: number;
  private readonly simStartMs: number;
  private readonly speedMultiplier: number;
  private readonly nowProvider: () => number;

  constructor(options: SimClockOptions) {
    this.nowProvider = options.nowProvider ?? (() => Date.now());
    this.realStartMs = this.nowProvider();
    this.simStartMs = options.simStart.getTime();
    this.speedMultiplier = options.speedMultiplier;
  }

  now(): Date {
    const realElapsedMs = this.nowProvider() - this.realStartMs;
    return new Date(this.simStartMs + realElapsedMs * this.speedMultiplier);
  }

  elapsedSimMinutes(): number {
    return (this.now().getTime() - this.simStartMs) / 60_000;
  }
}
