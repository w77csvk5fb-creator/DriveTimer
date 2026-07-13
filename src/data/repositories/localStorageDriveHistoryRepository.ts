import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { RiskLevel } from "@/domain/entities/riskLevel";
import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";
import type { DriveHistoryRepository } from "@/domain/repositories/driveHistoryRepository";
import { DRIVE_HISTORY_MAX_ENTRIES } from "@/core/constants/appConstants";

const STORAGE_KEY = "drivetime.driveHistory.v1";

interface StoredEntry {
  readonly id: string;
  readonly recordedAt: string;
  readonly origin: GeoPoint;
  readonly destination: GeoPoint;
  readonly drivingDurationMs: number;
  readonly scheduledArrival: string;
  readonly actualArrival: string;
  readonly maxRiskLevel: RiskLevel;
  readonly arrivalGuaranteeModeTriggered: boolean;
  readonly safetyBufferMinutes: number;
}

function toStored(entry: DriveHistoryEntry): StoredEntry {
  return {
    ...entry,
    recordedAt: entry.recordedAt.toISOString(),
    scheduledArrival: entry.scheduledArrival.toISOString(),
    actualArrival: entry.actualArrival.toISOString(),
  };
}

function fromStored(stored: StoredEntry): DriveHistoryEntry {
  return {
    ...stored,
    recordedAt: new Date(stored.recordedAt),
    scheduledArrival: new Date(stored.scheduledArrival),
    actualArrival: new Date(stored.actualArrival),
  };
}

/** V1の履歴保存先。直近DRIVE_HISTORY_MAX_ENTRIES件のみをFIFOで保持する。 */
export class LocalStorageDriveHistoryRepository implements DriveHistoryRepository {
  async saveSession(entry: DriveHistoryEntry): Promise<void> {
    const all = await this.readAll();
    const next = [...all, entry].slice(-DRIVE_HISTORY_MAX_ENTRIES);
    this.writeAll(next);
  }

  async listSessions(): Promise<readonly DriveHistoryEntry[]> {
    const all = await this.readAll();
    return [...all].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async deleteSession(id: string): Promise<void> {
    const all = await this.readAll();
    this.writeAll(all.filter((entry) => entry.id !== id));
  }

  async clearAll(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }

  private async readAll(): Promise<DriveHistoryEntry[]> {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredEntry[];
      return parsed.map(fromStored);
    } catch {
      return [];
    }
  }

  private writeAll(entries: readonly DriveHistoryEntry[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.map(toStored)));
  }
}
