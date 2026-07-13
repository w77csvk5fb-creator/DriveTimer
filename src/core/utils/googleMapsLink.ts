import type { GeoPoint } from "@/domain/entities/geoPoint";

/** 実ナビとしてGoogle Mapsアプリ/Webへ引き継ぐための外部リンクを組み立てる */
export function buildGoogleMapsDirectionsUrl(origin: GeoPoint, destination: GeoPoint): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
