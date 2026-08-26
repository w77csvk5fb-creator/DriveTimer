import type {
  LocationRepository,
  LocationUpdate,
  LocationError,
} from "@/domain/repositories/locationRepository";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import { destinationPoint, pointAtDistanceFromEnd } from "@/core/utils/geoUtils";
import type { DriveScenario } from "./scenarios/driveScenario";
import { computeRouteScaleFactor } from "./scenarios/routeScaling";
import { interpolateLinear } from "./keyframeInterpolation";
import type { SimClock } from "./simClock";

const TICK_INTERVAL_MS = 1_000;

/**
 * GPSの代わりにシナリオのキーフレームを再生する疑似位置情報ソース。
 * LocationRepositoryと同じインターフェースを実装するため、activeDriveStore以降の
 * ロジックは本番実装(geolocationDataSource)と完全に共通のまま扱える。
 * routePathを渡すと、目的地からの相対距離カーブをそのルート上の位置に変換して
 * 実際の道路に沿って移動する(取得できなかった場合は従来通り直線移動にフォールバックする)。
 */
export class SimulatedLocationDataSource implements LocationRepository {
  private readonly routeScaleFactor: number;

  constructor(
    private readonly scenario: DriveScenario,
    private readonly clock: SimClock,
    private readonly routePath: readonly GeoPoint[] | null = null,
  ) {
    this.routeScaleFactor = computeRouteScaleFactor(scenario, routePath);
  }

  watchPosition(
    onUpdate: (update: LocationUpdate) => void,
    _onError: (error: LocationError) => void,
  ): () => void {
    const tick = () => {
      const atMinutes = this.clock.elapsedSimMinutes();
      const distanceKm = interpolateLinear(
        this.scenario.pathKeyframes,
        atMinutes,
        (k) => k.distanceFromDestinationKm,
      );
      const position =
        this.routePath && this.routePath.length > 1
          ? pointAtDistanceFromEnd(this.routePath, distanceKm * 1000 * this.routeScaleFactor)
          : destinationPoint(this.scenario.destination, this.scenario.bearingDeg, distanceKm * 1000);
      onUpdate({ position, timestamp: this.clock.now() });
    };

    tick();
    const intervalId = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }
}
