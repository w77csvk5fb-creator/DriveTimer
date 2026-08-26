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
import { computeRouteScaleFactor } from "./scenarios/routeScaling";
import { interpolateLinear } from "./keyframeInterpolation";
import type { SimClock } from "./simClock";

const AVG_SPEED_MPS = (DEFAULT_AVG_CRUISE_SPEED_KMH * 1000) / 3600;

/**
 * 実際のDirections APIの代わりに、シナリオの渋滞係数カーブから決定論的にETAを算出する。
 * 目的地までの残り距離(シナリオのキーフレームカーブ、実ルートが取れていれば実ルート全長に
 * スケーリング済み) ÷ 平均巡航速度 × その時点の渋滞係数、という単純なモデル。
 * turnBackCalculator/notificationThresholdEvaluatorへは本番と全く同じ形(EtaResult)で渡すため、
 * それらのロジックはシミュレーションでも完全に共通のまま動作する。
 */
export class SimulatedDirectionsRepository implements DirectionsRepository {
  private readonly routeScaleFactor: number;

  constructor(
    private readonly scenario: DriveScenario,
    private readonly clock: SimClock,
    private readonly routePath: readonly GeoPoint[] | null = null,
    /** 取得できた実ルートのエンコード済みポリライン。取得できなかった場合は空文字。 */
    private readonly routePolyline: string = "",
  ) {
    this.routeScaleFactor = computeRouteScaleFactor(scenario, routePath);
  }

  async getTrafficAwareEta(_origin: GeoPoint, _destination: GeoPoint): Promise<RouteDetail> {
    const atMinutes = this.clock.elapsedSimMinutes();
    const distanceKm = interpolateLinear(
      this.scenario.pathKeyframes,
      atMinutes,
      (k) => k.distanceFromDestinationKm,
    );
    const distanceMeters = distanceKm * 1000 * this.routeScaleFactor;
    const multiplier = interpolateLinear(
      this.scenario.trafficKeyframes,
      atMinutes,
      (k) => k.multiplier,
    );
    const durationMs = (distanceMeters / AVG_SPEED_MPS) * 1000 * multiplier;
    // シミュレーションには実際の道路案内文データが無いため、ターンバイターン表示は空で返す
    // (HomeScreen側はsteps/overviewPolylineが空なら案内バナー・ルート線を出さずに済ませる)。
    // overviewPolylineのみ、実ルートを取得できていればその形状を返し地図に描画させる。
    return { durationMs, distanceMeters, steps: [], overviewPolyline: this.routePolyline };
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
    return { durationMs, distanceMeters, steps: [], overviewPolyline: "" };
  }
}
