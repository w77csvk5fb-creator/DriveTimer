// アプリ全体で使う定数値。数値の根拠はplans/実装プランを参照。

/** 再計算ティッカーの最小間隔（ミリ秒） */
export const RECALC_INTERVAL_MS = 20_000;

/** この距離(m)以上移動したら20秒を待たず再計算する */
export const RECALC_DISTANCE_METERS = 300;

/** カウントダウン表示を更新するUIティッカーの間隔（ミリ秒） */
export const UI_TICK_INTERVAL_MS = 1_000;

/** この距離(m)以内に近づいたら「到着」とみなす */
export const ARRIVAL_DETECTION_RADIUS_METERS = 100;

/** 安全バッファの選択肢（分） */
export const SAFETY_BUFFER_OPTIONS_MINUTES = [5, 10, 15, 20, 30] as const;

/** 安全バッファの既定値（分） */
export const DEFAULT_SAFETY_BUFFER_MINUTES = 10;

/**
 * リスクレベル判定のしきい値（自由時間残り、分）。
 * safe: この値より大きい／caution: この値より大きい／warning: この値より大きい／それ以下はcritical
 */
export const RISK_THRESHOLDS_MINUTES = {
  safe: 15,
  caution: 5,
  warning: 0,
} as const;

/** 折り返し通知のしきい値（自由時間残り、分） */
export const NOTIFICATION_THRESHOLDS_MINUTES = {
  fifteenMinWarning: 15,
  tenMinWarning: 10,
  fiveMinWarning: 5,
  timeUp: 0,
} as const;

/** 通知タイミング設定でユーザーが選択できる値（分）。時間切れ(0分)は常に有効で選択対象外。 */
export const NOTIFICATION_LEAD_TIME_OPTIONS_MINUTES = [15, 10, 5] as const;

/** 通知タイミングの既定値（分）。従来の固定挙動(15分前・5分前)をそのまま再現する。 */
export const DEFAULT_NOTIFICATION_LEAD_TIMES_MINUTES: readonly number[] = [15, 5];

/** シミュレーションモードの再生速度倍率の選択肢 */
export const SIMULATION_SPEED_MULTIPLIERS = [1, 2, 5, 10, 25, 50, 100] as const;

/** localStorageに保持するドライブ履歴の最大件数（FIFOで超過分を削除） */
export const DRIVE_HISTORY_MAX_ENTRIES = 10;

/** 平均巡航速度（km/h、シミュレーションのETA概算等に使用） */
export const DEFAULT_AVG_CRUISE_SPEED_KMH = 45;

/** 夜景カテゴリのゲート判定に使う、日没後どれだけ経てば「十分暗い」とみなすかの猶予（分） */
export const NIGHT_VIEW_DARKNESS_MARGIN_MINUTES = 20;

/** 景観ルート候補を生成する方位（度、北=0、時計回り、8方位） */
export const SCENIC_ROUTE_CANDIDATE_BEARINGS_DEG = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/** 自由時間のうちどれだけを目標周回時間に充てるか（残りは往復の余裕分） */
export const SCENIC_ROUTE_TIME_USE_FRACTION = 0.7;

/** 目標周回時間との適合度を判定する許容誤差（±40%）。段階的に緩和する際の初期値。 */
export const SCENIC_ROUTE_DURATION_FIT_TOLERANCE = 0.4;

/** 自由時間がこの分数未満の場合、景観ルート提案自体をスキップする */
export const SCENIC_ROUTE_MIN_FREE_TIME_MINUTES = 10;

/** 許容誤差を緩和してでも確保したい候補の最低件数 */
export const SCENIC_ROUTE_MIN_RESULTS_TARGET = 3;

/** 提示する候補の最大件数 */
export const SCENIC_ROUTE_MAX_RESULTS = 5;

/** combinedScore = categoryConfidence*W + durationFitScore*(1-W) の重み */
export const SCENIC_SCORE_CATEGORY_WEIGHT = 0.5;
