/**
 * ドライブ終了後の安全評価（スコアではなく参考情報）。
 * perfect=🟢 / good=🟡 / close=🟠 / critical=🔴(到着保証モードが発動した)
 */
export type SafetyRating = "perfect" | "good" | "close" | "critical";
