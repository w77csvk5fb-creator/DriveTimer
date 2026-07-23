import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { ScenicRouteCandidate } from "@/domain/entities/scenicRouteCandidate";
import type { DirectionsRepository, RouteDetail } from "@/domain/repositories/directionsRepository";
import { computeDriveStatus } from "@/domain/services/turnBackCalculator";
import {
  durationFitScore,
  isHighwayInstruction,
  scoreRouteCategory,
} from "@/domain/services/routeCategoryScorer";
import { destinationPoint, haversineDistanceMeters } from "@/core/utils/geoUtils";
import {
  SCENIC_ROUTE_CANDIDATE_BEARINGS_DEG,
  SCENIC_ROUTE_TIME_USE_FRACTION,
  SCENIC_ROUTE_DURATION_FIT_TOLERANCE,
  SCENIC_ROUTE_MIN_FREE_TIME_MINUTES,
  SCENIC_ROUTE_MIN_RESULTS_TARGET,
  SCENIC_ROUTE_MAX_RESULTS,
  SCENIC_SCORE_CATEGORY_WEIGHT,
  SCENIC_ROUTE_HIGHWAY_USAGE_THRESHOLD,
  DEFAULT_AVG_CRUISE_SPEED_KMH,
} from "@/core/constants/appConstants";

export interface GenerateScenicRouteCandidatesParams {
  readonly directionsRepository: DirectionsRepository;
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly deadline: Date;
  readonly safetyBufferMinutes: number;
  readonly now: Date;
}

export type ScenicRouteSkippedReason = "insufficientFreeTime";

export interface GenerateScenicRouteCandidatesResult {
  readonly candidates: readonly ScenicRouteCandidate[];
  readonly skippedReason: ScenicRouteSkippedReason | null;
  /** 直行ルートの所要時間(ms)。UIで各候補との差分表示に使う。 */
  readonly directDurationMs: number;
}

const DEDUP_RADIUS_FRACTION = 0.15;
const MAX_TOLERANCE_RELAX_ATTEMPTS = 3;
const TOLERANCE_RELAX_FACTOR = 1.5;

interface Survivor {
  readonly bearingDeg: number;
  readonly waypoint: GeoPoint;
  readonly normalRoute: RouteDetail;
  readonly durationFitScore: number;
}

/** 案内文が高速道路区間と判定されたステップのポリラインだけを抽出する(地図プレビューの色分け用)。 */
function extractHighwaySegmentPolylines(route: RouteDetail): readonly string[] {
  return route.steps
    .filter((step) => isHighwayInstruction(step.instructionText) && step.polyline !== "")
    .map((step) => step.polyline);
}

/**
 * 景観ルート候補を生成する。
 * 1) 直行ETAから自由時間を算出し、不十分ならスキップ
 * 2) 自由時間の一部(TIME_USE_FRACTION)を使って往復可能な半径を見積もる
 * 3) 8方位の候補waypointを生成し、各経由ルートを取得
 * 4) 目標周回時間との適合度でフィルタ（許容誤差を段階的に緩和）
 * 5) 生存候補のみavoidHighways版を追加取得(高速道路利用時の代替ルート提案用)しカテゴリ判定
 * 6) waypointが近すぎる候補は重複排除し、スコア降順で上位を返す
 */
export async function generateScenicRouteCandidates(
  params: GenerateScenicRouteCandidatesParams,
): Promise<GenerateScenicRouteCandidatesResult> {
  const direct = await params.directionsRepository.getTrafficAwareEta(
    params.origin,
    params.destination,
  );
  const status = computeDriveStatus({
    now: params.now,
    deadline: params.deadline,
    etaToDestinationMs: direct.durationMs,
    safetyBufferMinutes: params.safetyBufferMinutes,
  });

  if (
    status.kind !== "onTrack" ||
    status.freeTimeRemainingMs / 60_000 < SCENIC_ROUTE_MIN_FREE_TIME_MINUTES
  ) {
    return { candidates: [], skippedReason: "insufficientFreeTime", directDurationMs: direct.durationMs };
  }

  const usableMs = status.freeTimeRemainingMs * SCENIC_ROUTE_TIME_USE_FRACTION;
  const targetDurationMs = direct.durationMs + usableMs;
  const avgSpeedMps = (DEFAULT_AVG_CRUISE_SPEED_KMH * 1000) / 3600;
  // 往復のため÷2: 自由時間の半分は離脱に、半分は目的地への帰還に充てる想定
  const reachDistanceMeters = ((usableMs / 1000) * avgSpeedMps) / 2;

  const bearingWaypoints = SCENIC_ROUTE_CANDIDATE_BEARINGS_DEG.map((bearingDeg) => ({
    bearingDeg,
    waypoint: destinationPoint(params.origin, bearingDeg, reachDistanceMeters),
  }));

  const normalRoutes = await Promise.all(
    bearingWaypoints.map(({ waypoint }) =>
      params.directionsRepository
        .getRouteViaWaypoint(params.origin, waypoint, params.destination)
        .catch(() => null),
    ),
  );

  let survivors: Survivor[] = [];
  let tolerance = SCENIC_ROUTE_DURATION_FIT_TOLERANCE;
  for (let attempt = 0; attempt < MAX_TOLERANCE_RELAX_ATTEMPTS; attempt++) {
    survivors = buildSurvivors(bearingWaypoints, normalRoutes, targetDurationMs, tolerance);
    if (survivors.length >= SCENIC_ROUTE_MIN_RESULTS_TARGET) break;
    tolerance *= TOLERANCE_RELAX_FACTOR;
  }

  // 許容誤差を最大まで緩めても0件なら、フィット度を無視してでも取得できた候補を出す(0件よりまし)。
  if (survivors.length === 0) {
    survivors = buildSurvivors(bearingWaypoints, normalRoutes, targetDurationMs, Infinity);
  }

  const avoidHighwaysRoutes = await Promise.all(
    survivors.map((s) =>
      params.directionsRepository
        .getRouteViaWaypoint(params.origin, s.waypoint, params.destination, {
          avoidHighways: true,
        })
        .catch(() => null),
    ),
  );

  const candidates: ScenicRouteCandidate[] = survivors.map((s) => {
    const { category, confidence, highwayRatio, windingRatio } = scoreRouteCategory({
      origin: params.origin,
      waypoint: s.waypoint,
      destination: params.destination,
      normalRoute: s.normalRoute,
      now: params.now,
    });
    const combinedScore =
      confidence * SCENIC_SCORE_CATEGORY_WEIGHT +
      s.durationFitScore * (1 - SCENIC_SCORE_CATEGORY_WEIGHT);

    return {
      id: `bearing-${s.bearingDeg}`,
      waypoint: s.waypoint,
      bearingDeg: s.bearingDeg,
      category,
      categoryConfidence: confidence,
      durationMs: s.normalRoute.durationMs,
      distanceMeters: s.normalRoute.distanceMeters,
      highwayRatio,
      windingRatio,
      durationFitScore: s.durationFitScore,
      combinedScore,
      overviewPolyline: s.normalRoute.overviewPolyline,
      usesHighway: highwayRatio > SCENIC_ROUTE_HIGHWAY_USAGE_THRESHOLD,
      highwaySegmentPolylines: extractHighwaySegmentPolylines(s.normalRoute),
    };
  });

  const dedupRadiusMeters = reachDistanceMeters * DEDUP_RADIUS_FRACTION;
  const deduped = dedupeScenicRouteCandidates(candidates, dedupRadiusMeters).slice(
    0,
    SCENIC_ROUTE_MAX_RESULTS,
  );

  // 高速道路を有意に使う候補には、同じ経由地・avoidHighways版を使った代替ルートも併せて提案する。
  const avoidRouteByBearing = new Map(
    survivors.map((s, index) => [s.bearingDeg, avoidHighwaysRoutes[index]] as const),
  );
  const withHighwayAlternatives: ScenicRouteCandidate[] = deduped.flatMap((candidate) => {
    if (!candidate.usesHighway) return [candidate];
    const avoidRoute = avoidRouteByBearing.get(candidate.bearingDeg);
    if (!avoidRoute) return [candidate];

    const { category, confidence, windingRatio } = scoreRouteCategory({
      origin: params.origin,
      waypoint: candidate.waypoint,
      destination: params.destination,
      normalRoute: avoidRoute,
      now: params.now,
    });
    const noHighwayFitScore = durationFitScore(avoidRoute.durationMs, targetDurationMs, Infinity);
    const alternative: ScenicRouteCandidate = {
      id: `${candidate.id}-no-highway`,
      waypoint: candidate.waypoint,
      bearingDeg: candidate.bearingDeg,
      category,
      categoryConfidence: confidence,
      durationMs: avoidRoute.durationMs,
      distanceMeters: avoidRoute.distanceMeters,
      highwayRatio: 0,
      windingRatio,
      durationFitScore: noHighwayFitScore,
      combinedScore:
        confidence * SCENIC_SCORE_CATEGORY_WEIGHT + noHighwayFitScore * (1 - SCENIC_SCORE_CATEGORY_WEIGHT),
      overviewPolyline: avoidRoute.overviewPolyline,
      usesHighway: false,
      highwaySegmentPolylines: [],
    };
    return [candidate, alternative];
  });

  return {
    candidates: withHighwayAlternatives,
    skippedReason: null,
    directDurationMs: direct.durationMs,
  };
}

function buildSurvivors(
  bearingWaypoints: ReadonlyArray<{ bearingDeg: number; waypoint: GeoPoint }>,
  normalRoutes: ReadonlyArray<RouteDetail | null>,
  targetDurationMs: number,
  tolerance: number,
): Survivor[] {
  const survivors: Survivor[] = [];
  for (let i = 0; i < bearingWaypoints.length; i++) {
    const normalRoute = normalRoutes[i];
    if (!normalRoute) continue;
    const fitScore = durationFitScore(normalRoute.durationMs, targetDurationMs, tolerance);
    if (fitScore <= 0 && Number.isFinite(tolerance)) continue;
    survivors.push({
      bearingDeg: bearingWaypoints[i].bearingDeg,
      waypoint: bearingWaypoints[i].waypoint,
      normalRoute,
      durationFitScore: fitScore,
    });
  }
  return survivors;
}

/**
 * waypoint同士がradiusMeters未満に近接する候補を重複とみなし、スコアが高い方だけを残す。
 * 現在の8方位均等生成では実質的にほぼ発火しない安全網だが、生成戦略が変わっても壊れないよう
 * 独立した純粋関数として切り出しテストする。
 */
export function dedupeScenicRouteCandidates(
  candidates: readonly ScenicRouteCandidate[],
  radiusMeters: number,
): ScenicRouteCandidate[] {
  const deduped: ScenicRouteCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.combinedScore - a.combinedScore)) {
    const tooClose = deduped.some(
      (kept) => haversineDistanceMeters(kept.waypoint, candidate.waypoint) < radiusMeters,
    );
    if (!tooClose) deduped.push(candidate);
  }
  return deduped;
}
