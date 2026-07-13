import type { DriveScenario } from "./driveScenario";
import { SCENARIO_DESTINATION } from "./sharedDestination";

/** 回復: 渋滞で悪化した後、解消してリスクレベルが下がる。発火済み通知は取り消されないことの確認にも使う。 */
export const recoveryScenario: DriveScenario = {
  id: "recovery",
  labelJa: "回復",
  descriptionJa: "渋滞が一時悪化しますが、途中で解消しリスクレベルが下がります。",
  destination: SCENARIO_DESTINATION,
  bearingDeg: 45,
  deadlineOffsetMinutes: 120,
  pathKeyframes: [
    { atMinutes: 0, distanceFromDestinationKm: 2 },
    { atMinutes: 20, distanceFromDestinationKm: 16 },
    { atMinutes: 50, distanceFromDestinationKm: 18 },
    { atMinutes: 80, distanceFromDestinationKm: 5 },
    { atMinutes: 95, distanceFromDestinationKm: 0.05 },
    { atMinutes: 100, distanceFromDestinationKm: 0.05 },
  ],
  trafficKeyframes: [
    { atMinutes: 0, multiplier: 1.0 },
    { atMinutes: 30, multiplier: 1.0 },
    { atMinutes: 50, multiplier: 2.3 },
    { atMinutes: 65, multiplier: 2.3 },
    { atMinutes: 85, multiplier: 1.0 },
    { atMinutes: 100, multiplier: 1.0 },
  ],
};
