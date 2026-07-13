import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface EtaResult {
  readonly durationMs: number;
  readonly distanceMeters: number;
}

export interface DirectionsRepository {
  getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult>;

  /** 「最短ルートへ変更」用。景観等を考慮しない、現時点で最速のルートを返す。 */
  getFastestRoute(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult>;
}
