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
});
