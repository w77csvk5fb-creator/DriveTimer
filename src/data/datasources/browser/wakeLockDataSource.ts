export interface WakeLockController {
  readonly isSupported: boolean;
  /** 取得を試み、成功したかどうかを返す */
  request(): Promise<boolean>;
  release(): Promise<void>;
}

/**
 * Wake Lock APIのラッパー。タブが非表示→再表示された際は自動解放されるため、
 * visibilitychangeで再取得する。非対応/取得失敗時はfalseを返すのみで例外は投げない
 * （呼び出し側はUIで警告バナーを出す）。
 */
export class BrowserWakeLockController implements WakeLockController {
  private sentinel: WakeLockSentinel | null = null;
  private visibilityHandler: (() => void) | null = null;

  get isSupported(): boolean {
    return typeof navigator !== "undefined" && "wakeLock" in navigator;
  }

  async request(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      this.sentinel = await navigator.wakeLock.request("screen");
      this.attachVisibilityHandler();
      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    this.detachVisibilityHandler();
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // 解放時のエラーは無視してよい
      }
      this.sentinel = null;
    }
  }

  private attachVisibilityHandler(): void {
    if (this.visibilityHandler || typeof document === "undefined") return;
    this.visibilityHandler = () => {
      if (document.visibilityState === "visible" && !this.sentinel) {
        void this.request();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private detachVisibilityHandler(): void {
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.visibilityHandler = null;
  }
}
