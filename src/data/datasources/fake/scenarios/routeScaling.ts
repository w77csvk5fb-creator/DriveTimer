import type { DriveScenario } from "./driveScenario";
import { pathLengthMeters } from "@/core/utils/geoUtils";
import type { GeoPoint } from "@/domain/entities/geoPoint";

/**
 * シナリオのpathKeyframesは「目的地からの距離(km)」を絶対値でハンドチューニングした値のため、
 * 実際に取得した道路ルートの全長とは一致しない。両者の最大距離を対応させるスケール係数を
 * 求め、キーフレームの距離(km)にこれを掛けることで実ルート上の対応距離(m)に変換できるようにする。
 * ルートが取得できていない(直線移動フォールバック時)は1を返し、キロメートル値をそのまま使う。
 */
export function computeRouteScaleFactor(
  scenario: DriveScenario,
  routePath: readonly GeoPoint[] | null,
): number {
  if (!routePath || routePath.length < 2) return 1;
  const scenarioMaxKm = Math.max(...scenario.pathKeyframes.map((k) => k.distanceFromDestinationKm));
  if (scenarioMaxKm <= 0) return 1;
  return pathLengthMeters(routePath) / (scenarioMaxKm * 1000);
}
