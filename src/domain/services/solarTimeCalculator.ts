import type { GeoPoint } from "@/domain/entities/geoPoint";
import { NIGHT_VIEW_DARKNESS_MARGIN_MINUTES } from "@/core/constants/appConstants";

export interface SolarTimes {
  readonly sunriseUtc: Date;
  readonly sunsetUtc: Date;
}

export type SolarTimesResult =
  | { readonly kind: "normal"; readonly times: SolarTimes }
  | { readonly kind: "polarNight" }
  | { readonly kind: "midnightSun" };

function dayOfYearUtc(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const startOfDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((startOfDay - startOfYear) / 86_400_000) + 1;
}

/**
 * NOAA公開の太陽位置近似式による日の出/日の入り(UTC)の算出。
 * 実用上±十数分程度の誤差はあるが、「夜景として十分暗いか」の判定には必要十分な精度。
 */
export function computeSolarTimes(point: GeoPoint, at: Date): SolarTimesResult {
  const dayOfYear = dayOfYearUtc(at);
  const hourUtc = at.getUTCHours() + at.getUTCMinutes() / 60 + at.getUTCSeconds() / 3600;

  // 太陽黄経に対応する分数年(ラジアン)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hourUtc - 12) / 24);

  // 均時差（分）
  const eqTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // 太陽赤緯（ラジアン）
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (point.lat * Math.PI) / 180;
  // 90.833°: 大気差＋太陽の視半径を考慮した「日の出/日の入り」の基準天頂角
  const zenithRad = (90.833 * Math.PI) / 180;

  const cosH =
    (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  if (cosH > 1) {
    return { kind: "polarNight" };
  }
  if (cosH < -1) {
    return { kind: "midnightSun" };
  }

  const hourAngleDeg = (Math.acos(cosH) * 180) / Math.PI;

  const sunriseMinutesUtc = 720 - 4 * (point.lng + hourAngleDeg) - eqTimeMinutes;
  const sunsetMinutesUtc = 720 - 4 * (point.lng - hourAngleDeg) - eqTimeMinutes;

  const dayStartUtcMs = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  return {
    kind: "normal",
    times: {
      sunriseUtc: new Date(dayStartUtcMs + sunriseMinutesUtc * 60_000),
      sunsetUtc: new Date(dayStartUtcMs + sunsetMinutesUtc * 60_000),
    },
  };
}

/**
 * 夜景カテゴリのゲート判定。日没から`NIGHT_VIEW_DARKNESS_MARGIN_MINUTES`経過後〜日の出前を
 * 「十分暗い」とみなす（日没直後の薄明るい時間帯は含めない）。極夜は常に暗い、白夜は常に明るい扱い。
 */
export function isDarkEnoughForNightView(point: GeoPoint, at: Date): boolean {
  const result = computeSolarTimes(point, at);
  if (result.kind === "polarNight") return true;
  if (result.kind === "midnightSun") return false;

  const darkStartMs =
    result.times.sunsetUtc.getTime() + NIGHT_VIEW_DARKNESS_MARGIN_MINUTES * 60_000;
  return at.getTime() >= darkStartMs || at.getTime() < result.times.sunriseUtc.getTime();
}
