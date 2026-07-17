import type { GeoPoint } from "./geoPoint";
import type { RouteCategory } from "./routeCategory";

export interface ScenicRouteCandidate {
  readonly id: string;
  readonly waypoint: GeoPoint;
  readonly bearingDeg: number;
  readonly category: RouteCategory;
  /** 0〜1、カテゴリ判定の確信度 */
  readonly categoryConfidence: number;
  readonly durationMs: number;
  readonly distanceMeters: number;
  /** 0〜1、ハイウェイ利用比率（大きいほどハイウェイ中心） */
  readonly highwayRatio: number;
  /** 0〜1、直線距離に対する実距離の超過分（大きいほど曲がりくねっている） */
  readonly windingRatio: number;
  /** 0〜1、目標周回時間との適合度 */
  readonly durationFitScore: number;
  readonly combinedScore: number;
  /** 地図プレビュー描画用のエンコード済みポリライン。取得できない場合は空文字。 */
  readonly overviewPolyline: string;
}
