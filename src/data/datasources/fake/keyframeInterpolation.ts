interface Keyframe {
  readonly atMinutes: number;
}

/**
 * シナリオのキーフレーム配列(atMinutes昇順、先頭はatMinutes:0であることを前提)を
 * 線形補間する。範囲外は最初/最後のキーフレームの値でクランプする。
 */
export function interpolateLinear<K extends Keyframe>(
  keyframes: readonly K[],
  atMinutes: number,
  valueOf: (keyframe: K) => number,
): number {
  if (keyframes.length === 0) {
    throw new Error("keyframes must not be empty");
  }

  const first = keyframes[0];
  if (atMinutes <= first.atMinutes) return valueOf(first);

  const last = keyframes[keyframes.length - 1];
  if (atMinutes >= last.atMinutes) return valueOf(last);

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (atMinutes >= a.atMinutes && atMinutes <= b.atMinutes) {
      const t = (atMinutes - a.atMinutes) / (b.atMinutes - a.atMinutes);
      return valueOf(a) + (valueOf(b) - valueOf(a)) * t;
    }
  }

  return valueOf(last);
}
