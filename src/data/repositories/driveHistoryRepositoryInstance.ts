import { LocalStorageDriveHistoryRepository } from "./localStorageDriveHistoryRepository";

// アプリ全体で共有する単一インスタンス。V2でFirestore実装に差し替える際もここだけ変更すればよい。
export const driveHistoryRepository = new LocalStorageDriveHistoryRepository();
