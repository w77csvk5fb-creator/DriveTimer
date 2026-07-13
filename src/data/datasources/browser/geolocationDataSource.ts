import type {
  LocationError,
  LocationRepository,
  LocationUpdate,
} from "@/domain/repositories/locationRepository";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

function mapGeolocationError(error: GeolocationPositionError): LocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return { reason: "permissionDenied", message: "位置情報の利用が許可されていません。" };
    case error.TIMEOUT:
      return { reason: "timeout", message: "位置情報の取得がタイムアウトしました。" };
    default:
      return { reason: "unavailable", message: "位置情報を取得できませんでした。" };
  }
}

/** Browser Geolocation APIをLocationRepositoryとして薄くラップする本番実装。 */
export class GeolocationDataSource implements LocationRepository {
  watchPosition(
    onUpdate: (update: LocationUpdate) => void,
    onError: (error: LocationError) => void,
  ): () => void {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      onError({ reason: "unavailable", message: "この端末は位置情報取得に対応していません。" });
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          position: { lat: position.coords.latitude, lng: position.coords.longitude },
          timestamp: new Date(position.timestamp),
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => onError(mapGeolocationError(error)),
      WATCH_OPTIONS,
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }
}
