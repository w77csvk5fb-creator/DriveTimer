import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteDirectionsRepository } from "./directionsClient";

const origin = { lat: 35.6, lng: 139.7 };
const destination = { lat: 35.66, lng: 139.71 };

function mockFetchOnce(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

describe("RemoteDirectionsRepository", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers duration_in_traffic over plain duration", async () => {
    mockFetchOnce({
      status: "OK",
      routes: [
        {
          legs: [
            {
              duration: { value: 600 },
              duration_in_traffic: { value: 900 },
              distance: { value: 5000 },
            },
          ],
        },
      ],
    });

    const result = await new RemoteDirectionsRepository().getTrafficAwareEta(
      origin,
      destination,
    );
    expect(result.durationMs).toBe(900_000);
    expect(result.distanceMeters).toBe(5000);
  });

  it("falls back to plain duration when duration_in_traffic is absent", async () => {
    mockFetchOnce({
      status: "OK",
      routes: [{ legs: [{ duration: { value: 400 }, distance: { value: 3000 } }] }],
    });

    const result = await new RemoteDirectionsRepository().getTrafficAwareEta(
      origin,
      destination,
    );
    expect(result.durationMs).toBe(400_000);
  });

  it("extracts the overview polyline and step maneuvers for turn-by-turn display", async () => {
    mockFetchOnce({
      status: "OK",
      routes: [
        {
          overview_polyline: { points: "abc123" },
          legs: [
            {
              duration: { value: 600 },
              distance: { value: 5000 },
              steps: [
                {
                  html_instructions: "右折",
                  duration: { value: 60 },
                  distance: { value: 200 },
                  maneuver: "turn-right",
                  start_location: { lat: 35.6, lng: 139.7 },
                  end_location: { lat: 35.61, lng: 139.7 },
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await new RemoteDirectionsRepository().getTrafficAwareEta(origin, destination);
    expect(result.overviewPolyline).toBe("abc123");
    expect(result.steps[0].maneuver).toBe("turn-right");
    expect(result.steps[0].startLocation).toEqual({ lat: 35.6, lng: 139.7 });
    expect(result.steps[0].endLocation).toEqual({ lat: 35.61, lng: 139.7 });
  });

  it("throws when the API returns a non-OK status", async () => {
    mockFetchOnce({ status: "ZERO_RESULTS", routes: [] });

    await expect(
      new RemoteDirectionsRepository().getTrafficAwareEta(origin, destination),
    ).rejects.toThrow();
  });

  it("throws when the HTTP request itself fails", async () => {
    mockFetchOnce({ error: "not_configured" }, 501);

    await expect(
      new RemoteDirectionsRepository().getTrafficAwareEta(origin, destination),
    ).rejects.toThrow();
  });

  describe("getRouteViaWaypoint", () => {
    const waypoint = { lat: 35.63, lng: 139.705 };

    it("strips HTML tags from step instructions and maps duration/distance per step", async () => {
      mockFetchOnce({
        status: "OK",
        routes: [
          {
            legs: [
              {
                duration: { value: 600 },
                duration_in_traffic: { value: 700 },
                distance: { value: 4000 },
                steps: [
                  {
                    html_instructions: "海岸沿いを<b>右折</b>",
                    duration: { value: 300 },
                    distance: { value: 2000 },
                    maneuver: "turn-right",
                    start_location: { lat: 35.61, lng: 139.7 },
                    end_location: { lat: 35.62, lng: 139.7 },
                    polyline: { points: "step_poly_1" },
                  },
                  {
                    html_instructions: "山道を直進",
                    duration: { value: 400 },
                    distance: { value: 2000 },
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = await new RemoteDirectionsRepository().getRouteViaWaypoint(
        origin,
        waypoint,
        destination,
      );

      expect(result.durationMs).toBe(700_000);
      expect(result.distanceMeters).toBe(4000);
      expect(result.steps).toEqual([
        {
          instructionText: "海岸沿いを右折",
          durationMs: 300_000,
          distanceMeters: 2000,
          maneuver: "turn-right",
          startLocation: { lat: 35.61, lng: 139.7 },
          endLocation: { lat: 35.62, lng: 139.7 },
          polyline: "step_poly_1",
        },
        {
          instructionText: "山道を直進",
          durationMs: 400_000,
          distanceMeters: 2000,
          maneuver: null,
          startLocation: { lat: 0, lng: 0 },
          endLocation: { lat: 0, lng: 0 },
          polyline: "",
        },
      ]);
    });

    it("forwards the waypoint and avoidHighways flag as query params to /api/directions", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: "OK", routes: [{ legs: [{ distance: { value: 1 } }] }] }),
            { status: 200 },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);

      await new RemoteDirectionsRepository().getRouteViaWaypoint(origin, waypoint, destination, {
        avoidHighways: true,
      });

      const calledUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
      expect(calledUrl.searchParams.get("waypoint")).toBe("35.63,139.705");
      expect(calledUrl.searchParams.get("avoidHighways")).toBe("1");
    });

    it("returns an empty steps array when the response has no steps", async () => {
      mockFetchOnce({
        status: "OK",
        routes: [{ legs: [{ duration: { value: 100 }, distance: { value: 500 } }] }],
      });

      const result = await new RemoteDirectionsRepository().getRouteViaWaypoint(
        origin,
        waypoint,
        destination,
      );
      expect(result.steps).toEqual([]);
    });
  });
});
