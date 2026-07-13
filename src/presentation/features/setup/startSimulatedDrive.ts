import { SimClock } from "@/data/datasources/fake/simClock";
import { SimulatedLocationDataSource } from "@/data/datasources/fake/simulatedLocationDataSource";
import { SimulatedDirectionsRepository } from "@/data/datasources/fake/simulatedDirectionsRepository";
import { DRIVE_SCENARIOS, type DriveScenarioId } from "@/data/datasources/fake/scenarios";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";

/** シミュレーションモードでドライブを開始する。GPS/Directionsをシナリオ駆動のFakeに差し替えるだけで、以降は本番と全く同じactiveDriveStoreのロジックが動く。 */
export function startSimulatedDrive(
  scenarioId: DriveScenarioId,
  speedMultiplier: number,
  safetyBufferMinutes: number,
) {
  const scenario = DRIVE_SCENARIOS[scenarioId];
  const simStart = new Date();
  const clock = new SimClock({ simStart, speedMultiplier });
  const locationRepository = new SimulatedLocationDataSource(scenario, clock);
  const directionsRepository = new SimulatedDirectionsRepository(scenario, clock);
  const deadline = new Date(simStart.getTime() + scenario.deadlineOffsetMinutes * 60_000);

  useActiveDriveStore.getState().startDrive({
    destination: scenario.destination,
    deadline,
    safetyBufferMinutes,
    locationRepository,
    directionsRepository,
    historyRepository: driveHistoryRepository,
    now: () => clock.now(),
  });
}
