import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface EtaResult {
  readonly durationMs: number;
  readonly distanceMeters: number;
}

/** ルートの1ステップ（曲がり角ごとの案内など）の要約。景観ヒューリスティックのキーワード判定に使う。 */
export interface RouteStepSummary {
  readonly instructionText: string;
  readonly durationMs: number;
  readonly distanceMeters: number;
}

export interface RouteDetail extends EtaResult {
  readonly steps: readonly RouteStepSummary[];
}

export interface RouteViaWaypointOptions {
  readonly avoidHighways?: boolean;
}

export interface DirectionsRepository {
  getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult>;

  /** 「最短ルートへ変更」用。景観等を考慮しない、現時点で最速のルートを返す。 */
  getFastestRoute(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult>;

  /** 景観ルート提案用。origin→waypoint→destinationを単一ルートとして取得する。 */
  getRouteViaWaypoint(
    origin: GeoPoint,
    waypoint: GeoPoint,
    destination: GeoPoint,
    options?: RouteViaWaypointOptions,
  ): Promise<RouteDetail>;
}
