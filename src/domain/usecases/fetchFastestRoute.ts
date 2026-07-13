import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { DirectionsRepository, EtaResult } from "@/domain/repositories/directionsRepository";

/**
 * 「最短ルートへ変更」: 景観等を考慮しない、現時点で最速の直行ルートを取得する。
 * 到着保証モード時、まず安全に間に合うことを最優先するための機能。
 */
export async function fetchFastestRoute(
  directionsRepository: DirectionsRepository,
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<EtaResult> {
  return directionsRepository.getFastestRoute(origin, destination);
}
