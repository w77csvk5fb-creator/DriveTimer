import { SimClock } from "@/data/datasources/fake/simClock";
import { SimulatedLocationDataSource } from "@/data/datasources/fake/simulatedLocationDataSource";
import { SimulatedDirectionsRepository } from "@/data/datasources/fake/simulatedDirectionsRepository";
import { DRIVE_SCENARIOS, type DriveScenarioId } from "@/data/datasources/fake/scenarios";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";
import type { GeoPoint } from "@/domain/entities/geoPoint";

/**
 * シミュレーションモードでドライブを開始する。GPS/Directionsをシナリオ駆動のFakeに差し替えるだけで、
 * 以降は本番と全く同じactiveDriveStoreのロジックが動く。
 * シナリオの持つ「目的地からの相対距離・方位の変化カーブ」(pathKeyframes/bearingDeg)と
 * 「渋滞係数カーブ」(trafficKeyframes)はそのまま使い、目的地の座標と締切だけを実際に
 * 入力された値に差し替える(距離・方位のカーブは相対値なので、目的地がどこであっても成立する)。
 */
export function startSimulatedDrive(
  scenarioId: DriveScenarioId,
  speedMultiplier: number,
  safetyBufferMinutes: number,
  destination: GeoPoint,
  deadline: Date,
) {
  const scenario = { ...DRIVE_SCENARIOS[scenarioId], destination };
  const simStart = new Date();
  const clock = new SimClock({ simStart, speedMultiplier });
  const locationRepository = new SimulatedLocationDataSource(scenario, clock);
  const directionsRepository = new SimulatedDirectionsRepository(scenario, clock);

  useActiveDriveStore.getState().startDrive({
    destination,
    deadline,
    safetyBufferMinutes,
    notificationLeadTimesMinutes: useSettingsStore.getState().notificationLeadTimesMinutes,
    locationRepository,
    directionsRepository,
    historyRepository: driveHistoryRepository,
    now: () => clock.now(),
  });
}
