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
  fiveMinWarning: 5,
  timeUp: 0,
} as const;

/** シミュレーションモードの再生速度倍率の選択肢 */
export const SIMULATION_SPEED_MULTIPLIERS = [1, 2, 5, 10] as const;

/** localStorageに保持するドライブ履歴の最大件数（FIFOで超過分を削除） */
export const DRIVE_HISTORY_MAX_ENTRIES = 10;

/** 平均巡航速度（km/h、シミュレーションのETA概算等に使用） */
export const DEFAULT_AVG_CRUISE_SPEED_KMH = 45;
