import type { GeoPoint } from "@/domain/entities/geoPoint";
import type {
  DirectionsRepository,
  EtaResult,
  RouteDetail,
  RouteViaWaypointOptions,
} from "@/domain/repositories/directionsRepository";
import { haversineDistanceMeters } from "@/core/utils/geoUtils";
import { DEFAULT_AVG_CRUISE_SPEED_KMH } from "@/core/constants/appConstants";
import type { DriveScenario } from "./scenarios/driveScenario";
import { interpolateLinear } from "./keyframeInterpolation";
import type { SimClock } from "./simClock";

const AVG_SPEED_MPS = (DEFAULT_AVG_CRUISE_SPEED_KMH * 1000) / 3600;

/**
 * 実際のDirections APIの代わりに、シナリオの渋滞係数カーブから決定論的にETAを算出する。
 * 現在地-目的地間の直線距離 ÷ 平均巡航速度 × その時点の渋滞係数、という単純なモデル。
 * turnBackCalculator/notificationThresholdEvaluatorへは本番と全く同じ形(EtaResult)で渡すため、
 * それらのロジックはシミュレーションでも完全に共通のまま動作する。
 */
export class SimulatedDirectionsRepository implements DirectionsRepository {
  constructor(
    private readonly scenario: DriveScenario,
    private readonly clock: SimClock,
  ) {}

  async getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult> {
    const distanceMeters = haversineDistanceMeters(origin, destination);
    const atMinutes = this.clock.elapsedSimMinutes();
    const multiplier = interpolateLinear(
      this.scenario.trafficKeyframes,
      atMinutes,
      (k) => k.multiplier,
    );
    const durationMs = (distanceMeters / AVG_SPEED_MPS) * 1000 * multiplier;
    return { durationMs, distanceMeters };
  }

  async getFastestRoute(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult> {
    // 「最短ルートへ変更」: 渋滞係数を無視した理想的な直行ルートを返す。
    const distanceMeters = haversineDistanceMeters(origin, destination);
    const durationMs = (distanceMeters / AVG_SPEED_MPS) * 1000;
    return { durationMs, distanceMeters };
  }

  /**
   * インターフェースを満たすための簡易実装。シミュレーションモードには実際の道路・案内文
   * データが無いため、景観カテゴリ判定に意味のある結果は返せない(steps:[])。
   * 2区間(origin→waypoint, waypoint→destination)の直線距離を合算するだけの概算値。
   */
  async getRouteViaWaypoint(
    origin: GeoPoint,
    waypoint: GeoPoint,
    destination: GeoPoint,
    _options?: RouteViaWaypointOptions,
  ): Promise<RouteDetail> {
    const distanceMeters =
      haversineDistanceMeters(origin, waypoint) + haversineDistanceMeters(waypoint, destination);
    const durationMs = (distanceMeters / AVG_SPEED_MPS) * 1000;
    return { durationMs, distanceMeters, steps: [] };
  }
}
