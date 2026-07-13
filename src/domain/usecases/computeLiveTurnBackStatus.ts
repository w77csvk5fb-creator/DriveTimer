import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { DriveStatus } from "@/domain/entities/driveStatus";
import type { DirectionsRepository, EtaResult } from "@/domain/repositories/directionsRepository";
import { computeDriveStatus } from "@/domain/services/turnBackCalculator";

export interface ComputeLiveTurnBackStatusParams {
  readonly directionsRepository: DirectionsRepository;
  readonly currentPosition: GeoPoint;
  readonly destination: GeoPoint;
  readonly deadline: Date;
  readonly safetyBufferMinutes: number;
  readonly now: Date;
}

export interface ComputeLiveTurnBackStatusResult {
  readonly status: DriveStatus;
  readonly eta: EtaResult;
}

/**
 * 現在地→目的地のtraffic-aware ETAを取得し、折り返し計算エンジンにかける。
 * 本番(Google Directions API)でもシミュレーションでも、DirectionsRepositoryの実装さえ
 * 差し替えればこのusecase自体は完全に共通のまま動く。
 */
export async function computeLiveTurnBackStatus(
  params: ComputeLiveTurnBackStatusParams,
): Promise<ComputeLiveTurnBackStatusResult> {
  const eta = await params.directionsRepository.getTrafficAwareEta(
    params.currentPosition,
    params.destination,
  );
  const status = computeDriveStatus({
    now: params.now,
    deadline: params.deadline,
    etaToDestinationMs: eta.durationMs,
    safetyBufferMinutes: params.safetyBufferMinutes,
  });
  return { status, eta };
}
