import type { DriveScenario } from "./driveScenario";
import { SCENARIO_DESTINATION } from "./sharedDestination";

/** 大渋滞: 渋滞が深刻化し、安全バッファを考慮しても間に合わない到着保証モードまで到達する。 */
export const heavyTrafficScenario: DriveScenario = {
  id: "heavyTraffic",
  labelJa: "大渋滞",
  descriptionJa: "深刻な渋滞により🔴到着保証モードまで到達します。",
  destination: SCENARIO_DESTINATION,
  bearingDeg: 45,
  deadlineOffsetMinutes: 100,
  pathKeyframes: [
    { atMinutes: 0, distanceFromDestinationKm: 2 },
    { atMinutes: 20, distanceFromDestinationKm: 18 },
    { atMinutes: 50, distanceFromDestinationKm: 22 },
    { atMinutes: 85, distanceFromDestinationKm: 10 },
    { atMinutes: 110, distanceFromDestinationKm: 0.05 },
    { atMinutes: 115, distanceFromDestinationKm: 0.05 },
  ],
  trafficKeyframes: [
    { atMinutes: 0, multiplier: 1.0 },
    { atMinutes: 30, multiplier: 1.2 },
    { atMinutes: 50, multiplier: 2.5 },
    { atMinutes: 85, multiplier: 3.0 },
    { atMinutes: 110, multiplier: 1.5 },
    { atMinutes: 115, multiplier: 1.0 },
  ],
};
