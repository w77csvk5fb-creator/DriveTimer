import type { DriveScenario, DriveScenarioId } from "./driveScenario";
import { normalScenario } from "./normal";
import { trafficScenario } from "./traffic";
import { heavyTrafficScenario } from "./heavyTraffic";
import { recoveryScenario } from "./recovery";

export type { DriveScenario, DriveScenarioId } from "./driveScenario";

export const DRIVE_SCENARIOS: Readonly<Record<DriveScenarioId, DriveScenario>> = {
  normal: normalScenario,
  traffic: trafficScenario,
  heavyTraffic: heavyTrafficScenario,
  recovery: recoveryScenario,
};

export const DRIVE_SCENARIO_LIST: readonly DriveScenario[] = Object.values(DRIVE_SCENARIOS);
