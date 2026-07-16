import { create } from "zustand";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { DriveStatus } from "@/domain/entities/driveStatus";
import type { NotificationEvent, NotificationEventId } from "@/domain/entities/notificationEvent";
import type { RiskLevel } from "@/domain/entities/riskLevel";
import { worseRiskLevel } from "@/domain/entities/riskLevel";
import type { DriveSummary } from "@/domain/entities/driveSummary";
import type {
  LocationError,
  LocationRepository,
} from "@/domain/repositories/locationRepository";
import type {
  DirectionsRepository,
  EtaResult,
  RouteDetail,
} from "@/domain/repositories/directionsRepository";
import type { DriveHistoryRepository } from "@/domain/repositories/driveHistoryRepository";
import { BrowserWakeLockController } from "@/data/datasources/browser/wakeLockDataSource";
import { BrowserNotificationController } from "@/data/datasources/browser/webNotificationDataSource";
import { BrowserVibrationController } from "@/data/datasources/browser/vibrationDataSource";
import { WebAudioAlertController } from "@/data/datasources/browser/audioAlertDataSource";
import { computeLiveTurnBackStatus } from "@/domain/usecases/computeLiveTurnBackStatus";
import { endDriveSession } from "@/domain/usecases/endDriveSession";
import { fetchFastestRoute as fetchFastestRouteUsecase } from "@/domain/usecases/fetchFastestRoute";
import { evaluateNotificationThresholds } from "@/domain/services/notificationThresholdEvaluator";
import { computeDriveStatus } from "@/domain/services/turnBackCalculator";
import type { DriveStatusSample } from "@/domain/services/turnBackPointDetector";
import { haversineDistanceMeters } from "@/core/utils/geoUtils";
import {
  RECALC_INTERVAL_MS,
  RECALC_DISTANCE_METERS,
  UI_TICK_INTERVAL_MS,
  ARRIVAL_DETECTION_RADIUS_METERS,
  DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
} from "@/core/constants/appConstants";

export type DriveSessionPhase = "idle" | "active" | "ended";

export interface StartDriveParams {
  readonly destination: GeoPoint;
  readonly deadline: Date;
  readonly safetyBufferMinutes: number;
  /** ユーザーが設定画面で選んだ有効な折り返し通知タイミング（分）。省略時は既定値。 */
  readonly notificationLeadTimesMinutes?: readonly number[];
  /**
   * 出発前に選んだ景観ルート候補の経由地。表示（地図のルート線）にのみ使い、
   * 折り返し安全計算(現在地→目的地の直行ETA)には一切影響させない。
   */
  readonly scenicWaypoint?: GeoPoint | null;
  readonly locationRepository: LocationRepository;
  readonly directionsRepository: DirectionsRepository;
  readonly historyRepository: DriveHistoryRepository;
  /** 実本番は () => new Date()、シミュレーションはSimClock#nowを渡す */
  readonly now: () => Date;
}

interface ActiveDriveState {
  readonly phase: DriveSessionPhase;
  readonly destination: GeoPoint | null;
  readonly origin: GeoPoint | null;
  readonly deadline: Date | null;
  readonly safetyBufferMinutes: number | null;
  readonly currentPosition: GeoPoint | null;
  readonly driveStatus: DriveStatus | null;
  readonly firedNotificationIds: ReadonlySet<NotificationEventId>;
  readonly lastNotification: NotificationEvent | null;
  readonly lastEta: RouteDetail | null;
  readonly scenicWaypoint: GeoPoint | null;
  /** scenicWaypoint経由の表示専用ルート線。安全計算には使わない。取得失敗時はnull。 */
  readonly displayRoutePolyline: string | null;
  readonly summary: DriveSummary | null;
  readonly locationError: LocationError | null;
  readonly wakeLockSupported: boolean;
  readonly wakeLockActive: boolean;
  /** true=直近の再計算でDirections APIが失敗した(渋滞データが古いまま) */
  readonly directionsError: boolean;
  readonly fastestRoute: EtaResult | null;
  readonly fastestRouteLoading: boolean;

  startDrive(params: StartDriveParams): void;
  /** ユーザーが「ドライブ終了」ボタンで手動終了する場合 */
  endDrive(): void;
  /** サマリー画面を閉じてidleへ戻る */
  dismissSummary(): void;
  /** 到着保証モード時の「最短ルートへ変更」ボタン */
  fetchFastestRoute(): Promise<void>;
}

// ストア外で保持する非リアクティブな内部リソース。レンダリングに関係しないため分離する。
interface InternalRuntime {
  unsubscribeLocation: (() => void) | null;
  uiTickIntervalId: ReturnType<typeof setInterval> | null;
  recalcIntervalId: ReturnType<typeof setInterval> | null;
  lastRecalcPosition: GeoPoint | null;
  directionsRepository: DirectionsRepository | null;
  historyRepository: DriveHistoryRepository | null;
  nowProvider: (() => Date) | null;
  notificationLeadTimesMinutes: readonly number[];
  sessionStartedAt: Date | null;
  freeTimeAtStartMs: number | null;
  maxRiskLevel: RiskLevel;
  arrivalGuaranteeModeTriggered: boolean;
  distanceSamples: DriveStatusSample[];
  completing: boolean;
}

const wakeLockController = new BrowserWakeLockController();
const notificationController = new BrowserNotificationController();
const vibrationController = new BrowserVibrationController();
const audioAlertController = new WebAudioAlertController();

function notifyUser(event: NotificationEvent) {
  notificationController.show(event);
  vibrationController.vibrate(event.severity);
  audioAlertController.play(event.severity);
}

const runtime: InternalRuntime = {
  unsubscribeLocation: null,
  uiTickIntervalId: null,
  recalcIntervalId: null,
  lastRecalcPosition: null,
  directionsRepository: null,
  historyRepository: null,
  nowProvider: null,
  notificationLeadTimesMinutes: DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES,
  sessionStartedAt: null,
  freeTimeAtStartMs: null,
  maxRiskLevel: "safe",
  arrivalGuaranteeModeTriggered: false,
  distanceSamples: [],
  completing: false,
};

function stopTimersAndSubscriptions() {
  if (runtime.unsubscribeLocation) {
    runtime.unsubscribeLocation();
    runtime.unsubscribeLocation = null;
  }
  if (runtime.uiTickIntervalId) {
    clearInterval(runtime.uiTickIntervalId);
    runtime.uiTickIntervalId = null;
  }
  if (runtime.recalcIntervalId) {
    clearInterval(runtime.recalcIntervalId);
    runtime.recalcIntervalId = null;
  }
  void wakeLockController.release();
}

function resetSessionRuntime() {
  stopTimersAndSubscriptions();
  runtime.lastRecalcPosition = null;
  runtime.directionsRepository = null;
  runtime.historyRepository = null;
  runtime.nowProvider = null;
  runtime.notificationLeadTimesMinutes = DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES;
  runtime.sessionStartedAt = null;
  runtime.freeTimeAtStartMs = null;
  runtime.maxRiskLevel = "safe";
  runtime.arrivalGuaranteeModeTriggered = false;
  runtime.distanceSamples = [];
  runtime.completing = false;
}

/** onTrack/arrivalGuaranteeFailureいずれの新しい状態も、summary用の集計に反映する */
function applyStatusToRuntime(status: DriveStatus) {
  if (status.kind === "onTrack") {
    if (runtime.freeTimeAtStartMs === null) {
      runtime.freeTimeAtStartMs = status.freeTimeRemainingMs;
    }
    runtime.maxRiskLevel = worseRiskLevel(runtime.maxRiskLevel, status.risk);
  } else {
    runtime.arrivalGuaranteeModeTriggered = true;
  }
}

export const useActiveDriveStore = create<ActiveDriveState>((set, get) => ({
  phase: "idle",
  destination: null,
  origin: null,
  deadline: null,
  safetyBufferMinutes: null,
  currentPosition: null,
  driveStatus: null,
  firedNotificationIds: new Set(),
  lastNotification: null,
  lastEta: null,
  scenicWaypoint: null,
  displayRoutePolyline: null,
  summary: null,
  locationError: null,
  wakeLockSupported: false,
  wakeLockActive: false,
  directionsError: false,
  fastestRoute: null,
  fastestRouteLoading: false,

  startDrive(params) {
    // 通知許可はユーザー操作(出発ボタン押下)の呼び出し連鎖内でリクエストする必要がある
    void notificationController.requestPermission();

    resetSessionRuntime();

    set({
      phase: "active",
      destination: params.destination,
      origin: null,
      deadline: params.deadline,
      safetyBufferMinutes: params.safetyBufferMinutes,
      currentPosition: null,
      driveStatus: null,
      firedNotificationIds: new Set(),
      lastNotification: null,
      lastEta: null,
      scenicWaypoint: params.scenicWaypoint ?? null,
      displayRoutePolyline: null,
      summary: null,
      locationError: null,
      wakeLockSupported: wakeLockController.isSupported,
      wakeLockActive: false,
      directionsError: false,
      fastestRoute: null,
      fastestRouteLoading: false,
    });

    runtime.directionsRepository = params.directionsRepository;
    runtime.historyRepository = params.historyRepository;
    runtime.nowProvider = params.now;
    runtime.notificationLeadTimesMinutes =
      params.notificationLeadTimesMinutes ?? DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES;
    runtime.sessionStartedAt = params.now();

    void wakeLockController.request().then((acquired) => {
      set({ wakeLockActive: acquired, wakeLockSupported: wakeLockController.isSupported });
    });

    const runRecalc = async (position: GeoPoint) => {
      const state = get();
      if (state.phase !== "active" || !state.destination || !state.deadline) return;
      if (!runtime.directionsRepository || !runtime.nowProvider) return;

      runtime.lastRecalcPosition = position;
      const now = runtime.nowProvider();

      let result: Awaited<ReturnType<typeof computeLiveTurnBackStatus>>;
      try {
        result = await computeLiveTurnBackStatus({
          directionsRepository: runtime.directionsRepository,
          currentPosition: position,
          destination: state.destination,
          deadline: state.deadline,
          safetyBufferMinutes: state.safetyBufferMinutes ?? 0,
          now,
        });
      } catch {
        // Directions API障害時は直前の計算結果を保持したまま次のティックを待つ
        // （渋滞データが古いままになるが、クラッシュや無応答よりはましという判断）
        set({ directionsError: true });
        return;
      }
      const { status, eta } = result;
      set({ directionsError: false });

      applyStatusToRuntime(status);
      runtime.distanceSamples.push({
        timestamp: now,
        distanceMeters: haversineDistanceMeters(position, state.destination),
        recommendedTurnBackAt: status.kind === "onTrack" ? status.turnBackByTime : null,
      });

      const { newlyFired, firedIds } = evaluateNotificationThresholds(
        status,
        get().firedNotificationIds,
        runtime.notificationLeadTimesMinutes,
      );

      for (const event of newlyFired) {
        notifyUser(event);
      }

      set({
        driveStatus: status,
        lastEta: eta,
        firedNotificationIds: firedIds,
        lastNotification: newlyFired[0] ?? get().lastNotification,
      });

      // 表示専用: 選んだ景観ルートの経由地がある間は、その経路のポリラインも取得する。
      // 失敗しても安全計算には無関係のため無視する(直前の表示を保持)。
      if (state.scenicWaypoint && runtime.directionsRepository) {
        try {
          const displayRoute = await runtime.directionsRepository.getRouteViaWaypoint(
            position,
            state.scenicWaypoint,
            state.destination,
          );
          set({ displayRoutePolyline: displayRoute.overviewPolyline });
        } catch {
          // ignore
        }
      }
    };

    const completeDrive = async (endedAt: Date, finalPosition: GeoPoint | null) => {
      if (runtime.completing) return;
      runtime.completing = true;
      stopTimersAndSubscriptions();

      const state = get();
      if (
        !state.destination ||
        !state.deadline ||
        !runtime.historyRepository ||
        !runtime.sessionStartedAt ||
        state.safetyBufferMinutes === null
      ) {
        set({ phase: "idle" });
        return;
      }

      const summary = await endDriveSession({
        historyRepository: runtime.historyRepository,
        origin: state.origin ?? finalPosition ?? state.destination,
        destination: state.destination,
        sessionStartedAt: runtime.sessionStartedAt,
        endedAt,
        scheduledArrival: state.deadline,
        safetyBufferMinutes: state.safetyBufferMinutes,
        freeTimeAtStartMs: runtime.freeTimeAtStartMs ?? 0,
        maxRiskLevel: runtime.maxRiskLevel,
        arrivalGuaranteeModeTriggered: runtime.arrivalGuaranteeModeTriggered,
        distanceSamples: runtime.distanceSamples,
      });

      set({ phase: "ended", summary });
    };

    runtime.unsubscribeLocation = params.locationRepository.watchPosition(
      (update) => {
        if (runtime.completing) return;

        set((state) => ({
          currentPosition: update.position,
          origin: state.origin ?? update.position,
          locationError: null,
        }));

        const state = get();
        if (state.destination) {
          const distanceToDestination = haversineDistanceMeters(
            update.position,
            state.destination,
          );
          if (distanceToDestination <= ARRIVAL_DETECTION_RADIUS_METERS) {
            void completeDrive(update.timestamp, update.position);
            return;
          }
        }

        const shouldRecalc =
          !runtime.lastRecalcPosition ||
          haversineDistanceMeters(runtime.lastRecalcPosition, update.position) >=
            RECALC_DISTANCE_METERS;

        if (shouldRecalc) {
          void runRecalc(update.position);
        }
      },
      (error) => {
        set({ locationError: error });
      },
    );

    runtime.recalcIntervalId = setInterval(() => {
      if (runtime.completing) return;
      const position = get().currentPosition;
      if (position) void runRecalc(position);
    }, RECALC_INTERVAL_MS);

    runtime.uiTickIntervalId = setInterval(() => {
      if (runtime.completing) return;
      const state = get();
      if (state.phase !== "active" || !state.deadline || !state.lastEta) return;
      if (!runtime.nowProvider) return;

      const status = computeDriveStatus({
        now: runtime.nowProvider(),
        deadline: state.deadline,
        etaToDestinationMs: state.lastEta.durationMs,
        safetyBufferMinutes: state.safetyBufferMinutes ?? 0,
      });
      applyStatusToRuntime(status);
      set({ driveStatus: status });
    }, UI_TICK_INTERVAL_MS);
  },

  endDrive() {
    if (runtime.completing) return;
    runtime.completing = true;
    stopTimersAndSubscriptions();

    const state = get();
    const now = runtime.nowProvider ? runtime.nowProvider() : new Date();

    if (
      !state.destination ||
      !state.deadline ||
      !runtime.historyRepository ||
      !runtime.sessionStartedAt ||
      state.safetyBufferMinutes === null
    ) {
      set({ phase: "idle" });
      return;
    }

    void endDriveSession({
      historyRepository: runtime.historyRepository,
      origin: state.origin ?? state.currentPosition ?? state.destination,
      destination: state.destination,
      sessionStartedAt: runtime.sessionStartedAt,
      endedAt: now,
      scheduledArrival: state.deadline,
      safetyBufferMinutes: state.safetyBufferMinutes,
      freeTimeAtStartMs: runtime.freeTimeAtStartMs ?? 0,
      maxRiskLevel: runtime.maxRiskLevel,
      arrivalGuaranteeModeTriggered: runtime.arrivalGuaranteeModeTriggered,
      distanceSamples: runtime.distanceSamples,
    }).then((summary) => {
      set({ phase: "ended", summary });
    });
  },

  dismissSummary() {
    resetSessionRuntime();
    set({
      phase: "idle",
      destination: null,
      origin: null,
      deadline: null,
      safetyBufferMinutes: null,
      currentPosition: null,
      driveStatus: null,
      firedNotificationIds: new Set(),
      lastNotification: null,
      lastEta: null,
      scenicWaypoint: null,
      displayRoutePolyline: null,
      summary: null,
      locationError: null,
      wakeLockSupported: false,
      wakeLockActive: false,
      directionsError: false,
      fastestRoute: null,
      fastestRouteLoading: false,
    });
  },

  async fetchFastestRoute() {
    const state = get();
    if (!runtime.directionsRepository || !state.currentPosition || !state.destination) return;

    set({ fastestRouteLoading: true });
    try {
      const eta = await fetchFastestRouteUsecase(
        runtime.directionsRepository,
        state.currentPosition,
        state.destination,
      );
      set({ fastestRoute: eta });
    } catch {
      // 失敗しても致命的ではない。Google Mapsへの外部リンクは別途常に提示している
    } finally {
      set({ fastestRouteLoading: false });
    }
  },
}));
