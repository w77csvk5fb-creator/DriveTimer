import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserNotificationController } from "./webNotificationDataSource";

const sampleEvent = {
  id: "fifteenMinWarning" as const,
  severity: "info" as const,
  titleJa: "🔔 そろそろ折り返しましょう",
  bodyJa: "自由時間が残りわずかになってきました。",
};

function mockNotificationApi(permission: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(permission);
  const base = vi.fn();
  Object.defineProperty(base, "permission", {
    configurable: true,
    get: () => permission,
  });
  const NotificationMock = Object.assign(base, { requestPermission });
  vi.stubGlobal("Notification", NotificationMock);
  return { NotificationMock, requestPermission };
}

describe("BrowserNotificationController", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports unsupported and denies permission when Notification API is absent", async () => {
    vi.stubGlobal("Notification", undefined);
    const controller = new BrowserNotificationController();
    expect(controller.isSupported).toBe(false);
    expect(await controller.requestPermission()).toBe("denied");
  });

  it("does not show a notification when permission has not been granted", () => {
    const { NotificationMock } = mockNotificationApi("default");
    new BrowserNotificationController().show(sampleEvent);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("shows a notification with the event's title and body when permission is granted", () => {
    const { NotificationMock } = mockNotificationApi("granted");
    new BrowserNotificationController().show(sampleEvent);
    expect(NotificationMock).toHaveBeenCalledWith(
      sampleEvent.titleJa,
      expect.objectContaining({ body: sampleEvent.bodyJa, tag: sampleEvent.id }),
    );
  });

  it("swallows errors thrown by the Notification constructor", () => {
    mockNotificationApi("granted");
    // @ts-expect-error overriding the mocked constructor to throw for this test
    globalThis.Notification = vi.fn(() => {
      throw new Error("not allowed in this context");
    });
    Object.defineProperty(globalThis.Notification, "permission", {
      configurable: true,
      value: "granted",
    });

    expect(() => new BrowserNotificationController().show(sampleEvent)).not.toThrow();
  });
});
