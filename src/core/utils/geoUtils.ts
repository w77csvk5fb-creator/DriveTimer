import type { GeoPoint } from "@/domain/entities/geoPoint";

const EARTH_RADIUS_METERS = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** 2点間の直線距離(m)をHaversine公式で求める */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** fromからtoを見た初期方位(度、北=0、時計回り)を求める。ナビ画面での進行方向表示に使う。 */
export function bearingBetween(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearingDeg = toDeg(Math.atan2(y, x));
  return (bearingDeg + 360) % 360;
}

/**
 * Web Mercator図法での「地図上1ピクセルあたりの実距離(m)」を求める(タイル256px基準)。
 * 走行中の追従カメラで、画面上部を覆うオーバーレイの高さ分だけ地図の中心をずらす際、
 * ピクセル単位のオフセットを緯度経度のオフセットに変換するために使う。
 */
export function metersPerPixel(latitude: number, zoom: number): number {
  return (156_543.03392 * Math.cos(toRad(latitude))) / 2 ** zoom;
}

/** originから指定した方位(度、北=0、時計回り)・距離(m)だけ離れた地点を球面近似で求める */
export function destinationPoint(
  origin: GeoPoint,
  bearingDeg: number,
  distanceMeters: number,
): GeoPoint {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/** パス(道路に沿った座標列)の全長(m)を各セグメントのHaversine距離の合計で求める */
export function pathLengthMeters(path: readonly GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistanceMeters(path[i - 1], path[i]);
  }
  return total;
}

/**
 * パス(道路に沿った座標列)の終点から指定距離(m)だけ手前の地点を、該当セグメント内の
 * 線形補間で求める。距離が0以下ならパスの終点、全長以上ならパスの始点を返す(クランプ)。
 * シミュレーションモードで「目的地までの残り距離」を実ルート上の位置に変換するために使う。
 */
export function pointAtDistanceFromEnd(
  path: readonly GeoPoint[],
  distanceFromEndMeters: number,
): GeoPoint {
  if (path.length === 0) {
    throw new Error("path must not be empty");
  }
  if (path.length === 1 || distanceFromEndMeters <= 0) {
    return path[path.length - 1];
  }

  let remaining = distanceFromEndMeters;
  for (let i = path.length - 1; i > 0; i--) {
    const segmentStart = path[i - 1];
    const segmentEnd = path[i];
    const segmentLength = haversineDistanceMeters(segmentStart, segmentEnd);
    if (remaining <= segmentLength) {
      const t = segmentLength === 0 ? 0 : remaining / segmentLength;
      return {
        lat: segmentEnd.lat + (segmentStart.lat - segmentEnd.lat) * t,
        lng: segmentEnd.lng + (segmentStart.lng - segmentEnd.lng) * t,
      };
    }
    remaining -= segmentLength;
  }
  return path[0];
}
