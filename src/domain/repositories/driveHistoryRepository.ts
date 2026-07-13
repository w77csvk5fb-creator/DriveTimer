import type { DriveHistoryEntry } from "@/domain/entities/driveHistoryEntry";

/**
 * V1はlocalStorage実装、V2はFirestore実装に差し替える想定。
 * 呼び出し側(usecase/presentation)はこのインターフェースにのみ依存する。
 */
export interface DriveHistoryRepository {
  saveSession(entry: DriveHistoryEntry): Promise<void>;
  listSessions(): Promise<readonly DriveHistoryEntry[]>;
  deleteSession(id: string): Promise<void>;
  clearAll(): Promise<void>;
}
