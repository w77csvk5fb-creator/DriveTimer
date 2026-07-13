import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

async function callRoute(url: string) {
  const { GET } = await import("./route");
  return GET(new NextRequest(new URL(url, "http://localhost:3000")));
}

describe("GET /api/directions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("returns 501 when GOOGLE_DIRECTIONS_API_KEY is not configured", async () => {
    delete process.env.GOOGLE_DIRECTIONS_API_KEY;
    const response = await callRoute(
      "http://localhost:3000/api/directions?origin=35.6,139.7&destination=35.7,139.8",
    );
    expect(response.status).toBe(501);
  });

  it("returns 400 when origin or destination is missing", async () => {
    process.env.GOOGLE_DIRECTIONS_API_KEY = "real-key";
    const response = await callRoute("http://localhost:3000/api/directions?origin=35.6,139.7");
    expect(response.status).toBe(400);
  });

  it("proxies the request to the Google Directions API with traffic params", async () => {
    process.env.GOOGLE_DIRECTIONS_API_KEY = "real-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: "OK", routes: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute(
      "http://localhost:3000/api/directions?origin=35.6,139.7&destination=35.7,139.8",
    );
    expect(response.status).toBe(200);

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://maps.googleapis.com/maps/api/directions/json",
    );
    expect(calledUrl.searchParams.get("origin")).toBe("35.6,139.7");
    expect(calledUrl.searchParams.get("departure_time")).toBe("now");
    expect(calledUrl.searchParams.get("key")).toBe("real-key");
  });

  it("returns 502 when the upstream Directions API call fails", async () => {
    process.env.GOOGLE_DIRECTIONS_API_KEY = "real-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("error", { status: 500 })));

    const response = await callRoute(
      "http://localhost:3000/api/directions?origin=35.6,139.7&destination=35.7,139.8",
    );
    expect(response.status).toBe(502);
  });
});
