import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

async function callRoute(url: string) {
  const { GET } = await import("./route");
  return GET(new NextRequest(new URL(url, "http://localhost:3000")));
}

describe("GET /api/places", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("returns 501 when GOOGLE_PLACES_API_KEY is not configured", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const response = await callRoute("http://localhost:3000/api/places?input=tokyo");
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe("not_configured");
  });

  it("returns 400 when neither input nor placeId is provided", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "real-key";
    const response = await callRoute("http://localhost:3000/api/places");
    expect(response.status).toBe(400);
  });

  it("proxies autocomplete requests and forwards the API key header", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "real-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute("http://localhost:3000/api/places?input=tokyo");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:autocomplete",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Goog-Api-Key": "real-key" }),
      }),
    );
  });

  it("returns 502 when the upstream Places API call fails", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "real-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("error", { status: 403 })));

    const response = await callRoute("http://localhost:3000/api/places?input=tokyo");
    expect(response.status).toBe(502);
  });
});
