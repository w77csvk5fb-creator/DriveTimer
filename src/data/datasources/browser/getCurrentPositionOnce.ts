import type { GeoPoint } from "@/domain/entities/geoPoint";

/** 一回限りの現在地取得。継続監視するGeolocationDataSourceとは別物（Setup画面での単発利用向け）。 */
export function getCurrentPositionOnce(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("この端末は位置情報取得に対応していません。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        reject(new Error(`位置情報を取得できませんでした: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  });
}
