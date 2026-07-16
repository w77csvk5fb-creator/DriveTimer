export interface ManeuverPresentation {
  readonly emoji: string;
  readonly labelJa: string;
}

const DEFAULT_PRESENTATION: ManeuverPresentation = { emoji: "⬆️", labelJa: "直進" };

// Google Directions APIのmaneuver値 → 表示用アイコン・日本語ラベル
const MANEUVER_PRESENTATIONS: Record<string, ManeuverPresentation> = {
  "turn-left": { emoji: "⬅️", labelJa: "左折" },
  "turn-right": { emoji: "➡️", labelJa: "右折" },
  "turn-slight-left": { emoji: "↖️", labelJa: "斜め左折" },
  "turn-slight-right": { emoji: "↗️", labelJa: "斜め右折" },
  "turn-sharp-left": { emoji: "↙️", labelJa: "急な左折" },
  "turn-sharp-right": { emoji: "↘️", labelJa: "急な右折" },
  "uturn-left": { emoji: "🔄", labelJa: "Uターン" },
  "uturn-right": { emoji: "🔄", labelJa: "Uターン" },
  straight: DEFAULT_PRESENTATION,
  merge: { emoji: "↗️", labelJa: "合流" },
  "fork-left": { emoji: "↖️", labelJa: "左方向へ分岐" },
  "fork-right": { emoji: "↗️", labelJa: "右方向へ分岐" },
  "ramp-left": { emoji: "↖️", labelJa: "左方向のランプ" },
  "ramp-right": { emoji: "↗️", labelJa: "右方向のランプ" },
  "keep-left": { emoji: "↖️", labelJa: "左寄りを維持" },
  "keep-right": { emoji: "↗️", labelJa: "右寄りを維持" },
  "roundabout-left": { emoji: "🔄", labelJa: "ラウンドアバウト(左)" },
  "roundabout-right": { emoji: "🔄", labelJa: "ラウンドアバウト(右)" },
  ferry: { emoji: "⛴️", labelJa: "フェリー" },
  "ferry-train": { emoji: "🚆", labelJa: "電車輸送" },
};

export function getManeuverPresentation(maneuver: string | null): ManeuverPresentation {
  if (!maneuver) return DEFAULT_PRESENTATION;
  return MANEUVER_PRESENTATIONS[maneuver] ?? DEFAULT_PRESENTATION;
}
