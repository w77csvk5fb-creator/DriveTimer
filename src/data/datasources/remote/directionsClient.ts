import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { DirectionsRepository, EtaResult } from "@/domain/repositories/directionsRepository";

interface DirectionsApiLeg {
  readonly duration?: { readonly value: number };
  readonly duration_in_traffic?: { readonly value: number };
  readonly distance?: { readonly value: number };
}

interface DirectionsApiRoute {
  readonly legs?: readonly DirectionsApiLeg[];
}

interface DirectionsApiResponse {
  readonly status: string;
  readonly routes?: readonly DirectionsApiRoute[];
}

function toLatLngParam(point: GeoPoint): string {
  return `${point.lat},${point.lng}`;
}

async function fetchDirections(
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<DirectionsApiResponse> {
  const params = new URLSearchParams({
    origin: toLatLngParam(origin),
    destination: toLatLngParam(destination),
  });
  const response = await fetch(`/api/directions?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`directions request failed with status ${response.status}`);
  }
  const data = (await response.json()) as DirectionsApiResponse;
  if (data.status !== "OK") {
    throw new Error(`directions API returned status ${data.status}`);
  }
  return data;
}

function extractEta(data: DirectionsApiResponse): EtaResult {
  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg) {
    throw new Error("no route found in directions response");
  }
  const durationMs = (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0) * 1000;
  const distanceMeters = leg.distance?.value ?? 0;
  return { durationMs, distanceMeters };
}

/** /api/directions プロキシ経由でGoogle Directions APIを呼ぶ本番実装。 */
export class RemoteDirectionsRepository implements DirectionsRepository {
  async getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult> {
    return extractEta(await fetchDirections(origin, destination));
  }

  async getFastestRoute(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult> {
    return extractEta(await fetchDirections(origin, destination));
  }
}
