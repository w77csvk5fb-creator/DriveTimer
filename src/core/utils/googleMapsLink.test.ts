import { describe, expect, it } from "vitest";
import { buildGoogleMapsDirectionsUrl } from "./googleMapsLink";

describe("buildGoogleMapsDirectionsUrl", () => {
  it("builds a valid Google Maps directions deep link", () => {
    const url = buildGoogleMapsDirectionsUrl(
      { lat: 35.6, lng: 139.7 },
      { lat: 35.66, lng: 139.71 },
    );
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://www.google.com/maps/dir/");
    expect(parsed.searchParams.get("origin")).toBe("35.6,139.7");
    expect(parsed.searchParams.get("destination")).toBe("35.66,139.71");
    expect(parsed.searchParams.get("travelmode")).toBe("driving");
  });
});
