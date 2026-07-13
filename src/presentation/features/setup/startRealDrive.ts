import { GeolocationDataSource } from "@/data/datasources/browser/geolocationDataSource";
import { RemoteDirectionsRepository } from "@/data/datasources/remote/directionsClient";
import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { useSettingsStore } from "@/presentation/stores/settingsStore";
import { driveHistoryRepository } from "@/data/repositories/driveHistoryRepositoryInstance";
import type { GeoPoint } from "@/domain/entities/geoPoint";

/** 実GPS・実Directionsでドライブを開始する。startSimulatedDrive.tsと同じ形でactiveDriveStoreへ依存性を注入する。 */
export function startRealDrive(
  destination: GeoPoint,
  deadline: Date,
  safetyBufferMinutes: number,
) {
  useActiveDriveStore.getState().startDrive({
    destination,
    deadline,
    safetyBufferMinutes,
    notificationLeadTimesMinutes: useSettingsStore.getState().notificationLeadTimesMinutes,
    locationRepository: new GeolocationDataSource(),
    directionsRepository: new RemoteDirectionsRepository(),
    historyRepository: driveHistoryRepository,
    now: () => new Date(),
  });
}
