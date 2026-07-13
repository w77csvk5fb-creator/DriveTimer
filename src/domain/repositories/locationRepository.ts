import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface LocationUpdate {
  readonly position: GeoPoint;
  readonly timestamp: Date;
  readonly accuracyMeters?: number;
}

export type LocationErrorReason = "permissionDenied" | "unavailable" | "timeout";

export interface LocationError {
  readonly reason: LocationErrorReason;
  readonly message: string;
}

export interface LocationRepository {
  /** 現在地の継続的な購読を開始する。返り値の関数を呼ぶと購読解除する。 */
  watchPosition(
    onUpdate: (update: LocationUpdate) => void,
    onError: (error: LocationError) => void,
  ): () => void;
}
