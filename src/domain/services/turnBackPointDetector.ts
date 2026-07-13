/** 再計算ティッカーの各ティックで記録するサンプル */
export interface DriveStatusSample {
  readonly timestamp: Date;
  readonly distanceMeters: number;
  /** その時点でのturnBackByTime。到着保証モード中(onTrackでない)はnull */
  readonly recommendedTurnBackAt: Date | null;
}

export interface TurnBackDetectionResult {
  readonly detectedAt: Date;
  readonly recommendedTurnBackAt: Date | null;
}

/**
 * セッション中の「現在地→目的地の距離」の時系列から、実際に目的地から最も離れた
 * 地点(=ユーザーが実際に折り返した地点)の時刻を検出する。
 * ユーザーが計算上の推奨時刻通りに折り返したとは限らないため、推奨値ではなく
 * 実際の挙動(GPSの軌跡)から検出する。
 */
export function detectTurnBackPoint(
  samples: readonly DriveStatusSample[],
): TurnBackDetectionResult | null {
  if (samples.length === 0) return null;

  let farthest = samples[0];
  for (const sample of samples) {
    if (sample.distanceMeters > farthest.distanceMeters) {
      farthest = sample;
    }
  }

  return {
    detectedAt: farthest.timestamp,
    recommendedTurnBackAt: farthest.recommendedTurnBackAt,
  };
}
