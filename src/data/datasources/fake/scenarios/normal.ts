import type { DriveScenario } from "./driveScenario";
import { SCENARIO_DESTINATION } from "./sharedDestination";

/** 通常走行: 渋滞なし。🟢のまま予定通り到着する。 */
export const normalScenario: DriveScenario = {
  id: "normal",
  labelJa: "通常走行",
  descriptionJa: "渋滞なし。予定通り🟢安全のまま到着します。",
  destination: SCENARIO_DESTINATION,
  bearingDeg: 45,
  deadlineOffsetMinutes: 130,
  pathKeyframes: [
    { atMinutes: 0, distanceFromDestinationKm: 2 },
    { atMinutes: 15, distanceFromDestinationKm: 15 },
    { atMinutes: 45, distanceFromDestinationKm: 18 },
    { atMinutes: 75, distanceFromDestinationKm: 8 },
    { atMinutes: 90, distanceFromDestinationKm: 0.05 },
    { atMinutes: 100, distanceFromDestinationKm: 0.05 },
  ],
  trafficKeyframes: [
    { atMinutes: 0, multiplier: 1.0 },
    { atMinutes: 100, multiplier: 1.0 },
  ],
};
