import { afterEach, describe, expect, it, vi } from "vitest";
import { GeolocationDataSource } from "./geolocationDataSource";

function mockGeolocation() {
  const clearWatch = vi.fn();
  const watchPosition = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition, clearWatch },
  });
  return { watchPosition, clearWatch };
}

describe("GeolocationDataSource", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.geolocation;
  });

  it("reports unavailable when geolocation is not supported", () => {
    // @ts-expect-error test cleanup of a non-standard jsdom property
    delete navigator.geolocation;
    const onUpdate = vi.fn();
    const onError = vi.fn();

    new GeolocationDataSource().watchPosition(onUpdate, onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "unavailable" }),
    );
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("maps a successful position callback into a LocationUpdate", () => {
    const { watchPosition } = mockGeolocation();
    watchPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 35.68, longitude: 139.76, accuracy: 12 },
        timestamp: 1_700_000_000_000,
      } as GeolocationPosition);
      return 1;
    });

    const onUpdate = vi.fn();
    new GeolocationDataSource().watchPosition(onUpdate, vi.fn());

    expect(onUpdate).toHaveBeenCalledWith({
      position: { lat: 35.68, lng: 139.76 },
      timestamp: new Date(1_700_000_000_000),
      accuracyMeters: 12,
    });
  });

  it("maps PERMISSION_DENIED to a permissionDenied LocationError", () => {
    const { watchPosition } = mockGeolocation();
    watchPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        return 1;
      },
    );

    const onError = vi.fn();
    new GeolocationDataSource().watchPosition(vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "permissionDenied" }),
    );
  });

  it("returns an unsubscribe function that calls clearWatch", () => {
    const { watchPosition, clearWatch } = mockGeolocation();
    watchPosition.mockReturnValue(42);

    const unsubscribe = new GeolocationDataSource().watchPosition(vi.fn(), vi.fn());
    unsubscribe();

    expect(clearWatch).toHaveBeenCalledWith(42);
  });
});
