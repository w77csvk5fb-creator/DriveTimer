import type { DriveScenario } from "./driveScenario";
import { SCENARIO_DESTINATION } from "./sharedDestination";

/** 渋滞発生: 走行中に渋滞が悪化し🟢→🟡→🟠→🔴と遷移するが、間に合わせて到着する。 */
export const trafficScenario: DriveScenario = {
  id: "traffic",
  labelJa: "渋滞発生",
  descriptionJa: "走行中に渋滞が悪化し、リスクが🟢→🟡→🟠→🔴と遷移します。",
  destination: SCENARIO_DESTINATION,
  bearingDeg: 45,
  deadlineOffsetMinutes: 100,
  pathKeyframes: [
    { atMinutes: 0, distanceFromDestinationKm: 2 },
    { atMinutes: 20, distanceFromDestinationKm: 18 },
    { atMinutes: 55, distanceFromDestinationKm: 20 },
    { atMinutes: 80, distanceFromDestinationKm: 6 },
    { atMinutes: 95, distanceFromDestinationKm: 0.05 },
    { atMinutes: 100, distanceFromDestinationKm: 0.05 },
  ],
  trafficKeyframes: [
    { atMinutes: 0, multiplier: 1.0 },
    { atMinutes: 30, multiplier: 1.0 },
    { atMinutes: 55, multiplier: 2.0 },
    { atMinutes: 80, multiplier: 1.4 },
    { atMinutes: 95, multiplier: 1.0 },
    { atMinutes: 100, multiplier: 1.0 },
  ],
};
