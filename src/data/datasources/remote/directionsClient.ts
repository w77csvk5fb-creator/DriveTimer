import type { GeoPoint } from "@/domain/entities/geoPoint";
import type {
  DirectionsRepository,
  EtaResult,
  RouteDetail,
  RouteStepSummary,
  RouteViaWaypointOptions,
} from "@/domain/repositories/directionsRepository";

interface DirectionsApiLatLng {
  readonly lat: number;
  readonly lng: number;
}

interface DirectionsApiStep {
  readonly html_instructions?: string;
  readonly duration?: { readonly value: number };
  readonly distance?: { readonly value: number };
  readonly maneuver?: string;
  readonly start_location?: DirectionsApiLatLng;
  readonly end_location?: DirectionsApiLatLng;
  readonly polyline?: { readonly points?: string };
}

interface DirectionsApiLeg {
  readonly duration?: { readonly value: number };
  readonly duration_in_traffic?: { readonly value: number };
  readonly distance?: { readonly value: number };
  readonly steps?: readonly DirectionsApiStep[];
}

interface DirectionsApiRoute {
  readonly legs?: readonly DirectionsApiLeg[];
  readonly overview_polyline?: { readonly points?: string };
}

interface DirectionsApiResponse {
  readonly status: string;
  readonly routes?: readonly DirectionsApiRoute[];
}

function toLatLngParam(point: GeoPoint): string {
  return `${point.lat},${point.lng}`;
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

interface FetchDirectionsOptions {
  readonly waypoint?: GeoPoint;
  readonly avoidHighways?: boolean;
}

async function fetchDirections(
  origin: GeoPoint,
  destination: GeoPoint,
  options?: FetchDirectionsOptions,
): Promise<DirectionsApiResponse> {
  const params = new URLSearchParams({
    origin: toLatLngParam(origin),
    destination: toLatLngParam(destination),
  });
  if (options?.waypoint) {
    params.set("waypoint", toLatLngParam(options.waypoint));
  }
  if (options?.avoidHighways) {
    params.set("avoidHighways", "1");
  }

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

function extractRouteDetail(data: DirectionsApiResponse): RouteDetail {
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route || !leg) {
    throw new Error("no route found in directions response");
  }
  const eta = extractEta(data);
  const steps: RouteStepSummary[] = (leg.steps ?? []).map((step) => ({
    instructionText: stripHtmlTags(step.html_instructions ?? ""),
    durationMs: (step.duration?.value ?? 0) * 1000,
    distanceMeters: step.distance?.value ?? 0,
    maneuver: step.maneuver ?? null,
    startLocation: step.start_location
      ? { lat: step.start_location.lat, lng: step.start_location.lng }
      : { lat: 0, lng: 0 },
    endLocation: step.end_location
      ? { lat: step.end_location.lat, lng: step.end_location.lng }
      : { lat: 0, lng: 0 },
    polyline: step.polyline?.points ?? "",
  }));
  return { ...eta, steps, overviewPolyline: route.overview_polyline?.points ?? "" };
}

/** /api/directions プロキシ経由でGoogle Directions APIを呼ぶ本番実装。 */
export class RemoteDirectionsRepository implements DirectionsRepository {
  async getTrafficAwareEta(origin: GeoPoint, destination: GeoPoint): Promise<RouteDetail> {
    return extractRouteDetail(await fetchDirections(origin, destination));
  }

  async getFastestRoute(origin: GeoPoint, destination: GeoPoint): Promise<EtaResult> {
    return extractEta(await fetchDirections(origin, destination));
  }

  async getRouteViaWaypoint(
    origin: GeoPoint,
    waypoint: GeoPoint,
    destination: GeoPoint,
    options?: RouteViaWaypointOptions,
  ): Promise<RouteDetail> {
    return extractRouteDetail(
      await fetchDirections(origin, destination, {
        waypoint,
        avoidHighways: options?.avoidHighways,
      }),
    );
  }
}
