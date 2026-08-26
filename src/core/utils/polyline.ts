import type { GeoPoint } from "@/domain/entities/geoPoint";

/**
 * Google Polyline Algorithm Format(precision 5)の文字列を座標列にデコードする。
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * Google Maps JS APIの geometry ライブラリ(未ロードの場面もある)に依存せず、
 * Directions APIのレスポンス文字列から直接デコードできるようにするための自前実装。
 */
export function decodePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
