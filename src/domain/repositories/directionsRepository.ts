import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface EtaResult {
  readonly durationMs: number;
  readonly distanceMeters: number;
}

/**
 * ルートの1ステップ（曲がり角ごとの案内など）の要約。
 * 景観ヒューリスティックのキーワード判定と、走行中のターンバイターン案内表示の両方に使う。
 */
export interface RouteStepSummary {
  readonly instructionText: string;
  readonly durationMs: number;
  readonly distanceMeters: number;
  /** Google Directions APIのmaneuver値(例: "turn-right")。無い場合はnull。 */
  readonly maneuver: string | null;
  readonly startLocation: GeoPoint;
  readonly endLocation: GeoPoint;
}

export interface RouteDetail extends EtaResult {
  readonly steps: readonly RouteStepSummary[];
  /** 地図描画用のエンコード済みポリライン。取得できない場合は空文字。 */
  readonly overviewPolyline: string;
}

export interface RouteViaWaypointOptions {
  readonly avoidHighways?: boolean;
}

export interface DirectionsRepository {
  /**
   * 現在地→目的地のtraffic-aware ETA。折り返し計算の安全側ロジックはEtaResult部分のみを
   * 参照するため、steps/overviewPolyline(走行中のナビ表示用)を追加しても既存の安全計算には影響しない。
   */
  getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<RouteDetail>;

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
