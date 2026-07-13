import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentPositionOnce } from "./getCurrentPositionOnce";

function mockGeolocation() {
  const getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return { getCurrentPosition };
}

describe("getCurrentPositionOnce", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.geolocation;
  });

  it("rejects when geolocation is not supported", async () => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.geolocation;
    await expect(getCurrentPositionOnce()).rejects.toThrow();
  });

  it("resolves with a GeoPoint mapped from the successful position", async () => {
    const { getCurrentPosition } = mockGeolocation();
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({ coords: { latitude: 35.68, longitude: 139.76 } } as GeolocationPosition);
    });

    await expect(getCurrentPositionOnce()).resolves.toEqual({ lat: 35.68, lng: 139.76 });
  });

  it("rejects when the browser reports an error", async () => {
    const { getCurrentPosition } = mockGeolocation();
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    );

    await expect(getCurrentPositionOnce()).rejects.toThrow(/denied/);
  });
});
