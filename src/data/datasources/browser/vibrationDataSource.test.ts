import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserVibrationController } from "./vibrationDataSource";

describe("BrowserVibrationController", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.vibrate;
  });

  it("does nothing when navigator.vibrate is unavailable (e.g. iOS Safari)", () => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.vibrate;
    expect(() => new BrowserVibrationController().vibrate("urgent")).not.toThrow();
  });

  it("calls navigator.vibrate with a longer pattern for more severe events", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });

    const controller = new BrowserVibrationController();
    controller.vibrate("info");
    controller.vibrate("urgent");

    const infoPattern = vibrate.mock.calls[0][0] as number[];
    const urgentPattern = vibrate.mock.calls[1][0] as number[];
    expect(urgentPattern.length).toBeGreaterThan(infoPattern.length);
  });
});
