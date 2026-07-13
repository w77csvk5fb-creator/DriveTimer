import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserWakeLockController } from "./wakeLockDataSource";

function mockWakeLockApi(overrides?: { requestImpl?: () => Promise<unknown> }) {
  const release = vi.fn().mockResolvedValue(undefined);
  const sentinel = { release };
  const request = overrides?.requestImpl ?? vi.fn().mockResolvedValue(sentinel);
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  return { request, release, sentinel };
}

describe("BrowserWakeLockController", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.wakeLock;
    vi.restoreAllMocks();
  });

  it("reports unsupported when the Wake Lock API is absent", async () => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.wakeLock;
    const controller = new BrowserWakeLockController();
    expect(controller.isSupported).toBe(false);
    expect(await controller.request()).toBe(false);
  });

  it("acquires the wake lock and reports success", async () => {
    mockWakeLockApi();
    const controller = new BrowserWakeLockController();
    expect(controller.isSupported).toBe(true);
    expect(await controller.request()).toBe(true);
  });

  it("returns false when acquisition throws (e.g. denied by the browser)", async () => {
    mockWakeLockApi({ requestImpl: vi.fn().mockRejectedValue(new Error("denied")) });
    const controller = new BrowserWakeLockController();
    expect(await controller.request()).toBe(false);
  });

  it("releases the underlying sentinel", async () => {
    const { release } = mockWakeLockApi();
    const controller = new BrowserWakeLockController();
    await controller.request();
    await controller.release();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
