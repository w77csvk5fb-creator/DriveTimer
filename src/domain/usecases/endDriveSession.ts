import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { RiskLevel } from "@/domain/entities/riskLevel";
import type { DriveSummary } from "@/domain/entities/driveSummary";
import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";
import type { DriveHistoryRepository } from "@/domain/repositories/driveHistoryRepository";
import {
  detectTurnBackPoint,
  type DriveStatusSample,
} from "@/domain/services/turnBackPointDetector";
import { classifySafetyRating } from "@/domain/services/safetyRatingClassifier";
import { generateDriveAdvice } from "@/domain/services/driveSummaryAdvisor";

export interface EndDriveSessionParams {
  readonly historyRepository: DriveHistoryRepository;
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly sessionStartedAt: Date;
  readonly endedAt: Date;
  readonly scheduledArrival: Date;
  readonly safetyBufferMinutes: number;
  readonly freeTimeAtStartMs: number;
  readonly maxRiskLevel: RiskLevel;
  readonly arrivalGuaranteeModeTriggered: boolean;
  readonly distanceSamples: readonly DriveStatusSample[];
}

/**
 * ドライブ終了アシスト: 振り返り用のDriveSummaryを組み立て、履歴として永続化する。
 * V1(localStorage)/V2(Firestore)どちらのDriveHistoryRepository実装を渡しても
 * このusecase自体は変更不要。
 */
export async function endDriveSession(params: EndDriveSessionParams): Promise<DriveSummary> {
  const drivingDurationMs = params.endedAt.getTime() - params.sessionStartedAt.getTime();
  const marginMs = params.scheduledArrival.getTime() - params.endedAt.getTime();
  const safetyRating = classifySafetyRating(
    params.maxRiskLevel,
    params.arrivalGuaranteeModeTriggered,
  );
  const turnBack = detectTurnBackPoint(params.distanceSamples);

  const adviceJa = generateDriveAdvice({
    marginMs,
    safetyBufferMinutes: params.safetyBufferMinutes,
    safetyRating,
    arrivalGuaranteeModeTriggered: params.arrivalGuaranteeModeTriggered,
    turnBackDetectedAt: turnBack?.detectedAt ?? null,
    recommendedTurnBackAt: turnBack?.recommendedTurnBackAt ?? null,
  });

  const summary: DriveSummary = {
    drivingDurationMs,
    freeTimeAtStartMs: params.freeTimeAtStartMs,
    turnBackDetectedAt: turnBack?.detectedAt ?? null,
    actualArrival: params.endedAt,
    scheduledArrival: params.scheduledArrival,
    marginMs,
    maxRiskLevel: params.maxRiskLevel,
    arrivalGuaranteeModeTriggered: params.arrivalGuaranteeModeTriggered,
    safetyRating,
    adviceJa,
  };

  const historyEntry: DriveHistoryEntry = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    recordedAt: params.endedAt,
    origin: params.origin,
    destination: params.destination,
    drivingDurationMs,
    scheduledArrival: params.scheduledArrival,
    actualArrival: params.endedAt,
    maxRiskLevel: params.maxRiskLevel,
    arrivalGuaranteeModeTriggered: params.arrivalGuaranteeModeTriggered,
    safetyBufferMinutes: params.safetyBufferMinutes,
  };

  await params.historyRepository.saveSession(historyEntry);

  return summary;
}
