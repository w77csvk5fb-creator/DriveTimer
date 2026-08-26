import { SimClock } from "@/data/datasources/fake/simClock";
import { SimulatedLocationDataSource } from "@/data/datasources/fake/simulatedLocationDataSource";
import { SimulatedDirectionsRepository } from "@/data/datasources/fake/simulatedDirectionsRepository";
import { DRIVE_SCENARIOS, type DriveScenarioId } from "@/data/datasources/fake/scenarios";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";
import { RemoteDirectionsRepository } from "@/data/datasources/remote/directionsClient";
import { getCurrentPositionOnce } from "@/data/datasources/browser/getCurrentPositionOnce";
import { decodePolyline } from "@/core/utils/polyline";
import type { GeoPoint } from "@/domain/entities/geoPoint";

/**
 * シミュレーションモードでドライブを開始する。GPS/Directionsをシナリオ駆動のFakeに差し替えるだけで、
 * 以降は本番と全く同じactiveDriveStoreのロジックが動く。
 * シナリオの持つ「目的地からの相対距離・方位の変化カーブ」(pathKeyframes/bearingDeg)と
 * 「渋滞係数カーブ」(trafficKeyframes)はそのまま使い、目的地の座標と締切だけを実際に
 * 入力された値に差し替える(距離・方位のカーブは相対値なので、目的地がどこであっても成立する)。
 *
 * 開始前に現在地→目的地の実ルートを一度だけ取得し、直線移動ではなく実際の道路に沿って
 * シミュレーション走行できるようにする。現在地取得やDirections APIが失敗した場合は、
 * 従来通りシナリオのbearingDeg方向への直線移動にフォールバックする。
 */
export async function startSimulatedDrive(
  scenarioId: DriveScenarioId,
  speedMultiplier: number,
  safetyBufferMinutes: number,
  destination: GeoPoint,
  deadline: Date,
) {
  const scenario = { ...DRIVE_SCENARIOS[scenarioId], destination };
  const simStart = new Date();
  const clock = new SimClock({ simStart, speedMultiplier });

  let routePath: readonly GeoPoint[] | null = null;
  let routePolyline = "";
  try {
    const origin = await getCurrentPositionOnce();
    const route = await new RemoteDirectionsRepository().getTrafficAwareEta(origin, destination);
    if (route.overviewPolyline) {
      routePath = decodePolyline(route.overviewPolyline);
      routePolyline = route.overviewPolyline;
    }
  } catch {
    // 現在地取得やDirections API呼び出しに失敗しても、直線移動でシミュレーションは続行する
  }

  const locationRepository = new SimulatedLocationDataSource(scenario, clock, routePath);
  const directionsRepository = new SimulatedDirectionsRepository(
    scenario,
    clock,
    routePath,
    routePolyline,
  );

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
