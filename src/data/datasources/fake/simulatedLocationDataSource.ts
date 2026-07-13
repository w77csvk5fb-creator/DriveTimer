import type {
  LocationRepository,
  LocationUpdate,
  LocationError,
} from "@/domain/repositories/locationRepository";
import { destinationPoint } from "@/core/utils/geoUtils";
import type { DriveScenario } from "./scenarios/driveScenario";
import { interpolateLinear } from "./keyframeInterpolation";
import type { SimClock } from "./simClock";

const TICK_INTERVAL_MS = 1_000;

/**
 * GPSの代わりにシナリオのキーフレームを再生する疑似位置情報ソース。
 * LocationRepositoryと同じインターフェースを実装するため、activeDriveStore以降の
 * ロジックは本番実装(geolocationDataSource)と完全に共通のまま扱える。
 */
export class SimulatedLocationDataSource implements LocationRepository {
  constructor(
    private readonly scenario: DriveScenario,
    private readonly clock: SimClock,
  ) {}

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
      const position = destinationPoint(
        this.scenario.destination,
        this.scenario.bearingDeg,
        distanceKm * 1000,
      );
      onUpdate({ position, timestamp: this.clock.now() });
    };

    tick();
    const intervalId = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }
}
