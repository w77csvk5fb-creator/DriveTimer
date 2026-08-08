import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { RouteStepSummary } from "@/domain/repositories/directionsRepository";
import { bearingBetween, haversineDistanceMeters } from "@/core/utils/geoUtils";

// GPSノイズによる方位のブレを避けるため、これ未満の移動では判定しない
const MIN_MOVEMENT_FOR_CHECK_METERS = 30;
// 現在の進行方向が案内中のステップの方向からこれ以上ズレていたら「外れた」とみなす
const OFF_ROUTE_BEARING_THRESHOLD_DEG = 90;

function angleDifferenceDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * 直近の移動方向が、案内中のルート(現在のステップ)の進行方向から大きく外れていないかを判定する。
 * 外れていた場合、次の定期再計算(距離/時間ベース)を待たずに即座に再計算すべきサイン。
 * これにより、案内から外れた道に入った際に古いルートの「戻る」指示が出続けるのを防ぐ。
 */
export function isLikelyOffRoute(
  currentStep: RouteStepSummary | undefined,
  previousPosition: GeoPoint | null,
  currentPosition: GeoPoint,
): boolean {
  if (!currentStep || !previousPosition) return false;

  const movedDistance = haversineDistanceMeters(previousPosition, currentPosition);
  if (movedDistance < MIN_MOVEMENT_FOR_CHECK_METERS) return false;

  const actualBearing = bearingBetween(previousPosition, currentPosition);
  const expectedBearing = bearingBetween(currentStep.startLocation, currentStep.endLocation);

  return angleDifferenceDeg(actualBearing, expectedBearing) > OFF_ROUTE_BEARING_THRESHOLD_DEG;
}
