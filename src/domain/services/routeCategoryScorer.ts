import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { RouteCategory } from "@/domain/entities/routeCategory";
import type { RouteDetail, RouteStepSummary } from "@/domain/repositories/directionsRepository";
import { haversineDistanceMeters } from "@/core/utils/geoUtils";
import { isDarkEnoughForNightView } from "./solarTimeCalculator";

type DaytimeCategory = Exclude<RouteCategory, "nightView">;

// 判定の優先順位はオブジェクトの列挙順（同点の場合は先勝ち）。
const KEYWORDS: Record<DaytimeCategory, readonly string[]> = {
  scenic: ["展望", "景勝", "絶景", "パノラマ"],
  coastal: ["海岸", "海沿い", "湾岸", "ビーチ", "コースト"],
  mountain: ["峠", "山道", "山地", "高原", "スカイライン"],
  winding: ["ワインディング", "カーブ", "九十九折", "つづら折り"],
  urban: ["市街", "中心街", "繁華街", "駅前"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 案内文からこのステップが高速道路(有料道路含む)区間かどうかをヒューリスティックに判定するキーワード。
// legacy Directions APIはステップ単位のhighwayフラグを返さないため、案内文の文言で近似する。
const HIGHWAY_KEYWORDS = [
  "高速道路",
  "高速",
  "自動車道",
  "有料道路",
  "都市高速",
  "首都高",
  "IC",
  "JCT",
  "SA",
  "PA",
] as const;

/** ステップの案内文が高速道路(有料道路含む)区間を示しているかをヒューリスティックに判定する。 */
export function isHighwayInstruction(instructionText: string): boolean {
  return HIGHWAY_KEYWORDS.some((keyword) => instructionText.includes(keyword));
}

function keywordScore(category: DaytimeCategory, steps: readonly RouteStepSummary[]): number {
  if (steps.length === 0) return 0;
  const keywords = KEYWORDS[category];
  const hitCount = steps.filter((s) => keywords.some((k) => s.instructionText.includes(k))).length;
  return Math.min(1, (hitCount / steps.length) * 3);
}

export interface RouteCategoryScorerInput {
  readonly origin: GeoPoint;
  readonly waypoint: GeoPoint;
  readonly destination: GeoPoint;
  readonly normalRoute: RouteDetail;
  readonly now: Date;
}

export interface RouteCategoryScoreResult {
  readonly category: RouteCategory;
  readonly confidence: number;
  readonly highwayRatio: number;
  readonly windingRatio: number;
}

/**
 * ルートのステップ案内文・直線距離との比率・ハイウェイ利用比率・現在時刻の明暗から、
 * 6カテゴリのうち最も当てはまるものをヒューリスティックに判定する純粋関数。
 */
export function scoreRouteCategory(input: RouteCategoryScorerInput): RouteCategoryScoreResult {
  const straightLineDistance =
    haversineDistanceMeters(input.origin, input.waypoint) +
    haversineDistanceMeters(input.waypoint, input.destination);
  const windingRatio =
    straightLineDistance > 0
      ? clamp(input.normalRoute.distanceMeters / straightLineDistance - 1, 0, 1)
      : 0;

  // 高速道路利用比率は、案内文から高速道路区間と判定されたステップの距離が
  // ルート全体の距離に占める割合として求める。地図プレビューの色分け(extractHighwaySegmentPolylines)
  // と同じ判定方法(isHighwayInstruction)を使うことで、バッジ表示と地図の色分けが食い違わないようにする。
  // (以前はavoidHighways版との所要時間差から推定していたが、交通状況次第で実際の高速道路利用と
  // 乖離することがあった)
  const highwayDistanceMeters = input.normalRoute.steps
    .filter((step) => isHighwayInstruction(step.instructionText))
    .reduce((sum, step) => sum + step.distanceMeters, 0);
  const highwayRatio =
    input.normalRoute.distanceMeters > 0
      ? clamp(highwayDistanceMeters / input.normalRoute.distanceMeters, 0, 1)
      : 0;

  // 暗闇判定が最優先: 夜は海岸/山などの視覚的な違いを判別できないため。
  if (isDarkEnoughForNightView(input.waypoint, input.now)) {
    const confidence = clamp(
      0.7 +
        0.15 * keywordScore("coastal", input.normalRoute.steps) +
        0.15 * keywordScore("mountain", input.normalRoute.steps),
      0,
      0.95,
    );
    return { category: "nightView", confidence, highwayRatio, windingRatio };
  }

  const steps = input.normalRoute.steps;
  const scores: Record<DaytimeCategory, number> = {
    scenic: keywordScore("scenic", steps) * 0.6 + windingRatio * 0.2 + (1 - highwayRatio) * 0.2,
    coastal: keywordScore("coastal", steps) * 0.8 + (1 - highwayRatio) * 0.2,
    mountain: keywordScore("mountain", steps) * 0.7 + windingRatio * 0.3,
    winding: windingRatio * 0.6 + keywordScore("winding", steps) * 0.4,
    urban: highwayRatio * 0.3 + (1 - windingRatio) * 0.3 + keywordScore("urban", steps) * 0.4,
  };

  let bestCategory: DaytimeCategory = "urban";
  let bestScore = -Infinity;
  for (const [category, score] of Object.entries(scores) as [DaytimeCategory, number][]) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return {
    category: bestCategory,
    confidence: clamp(bestScore, 0.3, 0.95),
    highwayRatio,
    windingRatio,
  };
}

/** 目標周回時間との適合度。許容誤差(tolerance, 例0.4=±40%)の範囲外は0。 */
export function durationFitScore(candidateMs: number, targetMs: number, tolerance: number): number {
  if (targetMs <= 0) return 0;
  const ratio = candidateMs / targetMs;
  const deviation = Math.abs(ratio - 1);
  if (deviation > tolerance) return 0;
  return 1 - deviation / tolerance;
}
