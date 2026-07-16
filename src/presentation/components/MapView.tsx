"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import { clientEnv, isGoogleMapsConfigured } from "@/core/config/env";

interface MapViewProps {
  readonly currentPosition: GeoPoint | null;
  readonly destination: GeoPoint | null;
  /** 指定時、経由地マーカーを表示し、3点が収まるよう表示範囲を自動調整する(ルートプレビュー用)。 */
  readonly waypoint?: GeoPoint | null;
}

// トヨタ/レクサス的な黒基調ナビ画面に寄せたダークスタイル。
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#17181b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9ca3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0c0e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#202226" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a2c31" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0c0e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

let optionsInitialized = false;
function ensureMapsApiOptions(): void {
  if (optionsInitialized) return;
  setOptions({ key: clientEnv.googleMapsJsApiKey ?? "", v: "weekly" });
  optionsInitialized = true;
}

/** Google Maps JavaScript APIで現在地・目的地を表示する。キー未設定時はプレースホルダーを表示する。 */
export function MapView({ currentPosition, destination, waypoint }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const waypointMarkerRef = useRef<google.maps.Marker | null>(null);
  // 地図オブジェクトの生成は非同期。生成完了前にdestination等が確定済みだと、
  // それらのprop自体は二度と変化せず対応するeffectが再実行されないままになるため、
  // 生成完了を状態として持ち、他の全effectの依存配列に加えて再評価を強制する。
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsConfigured || !containerRef.current) return;
    let cancelled = false;

    ensureMapsApiOptions();
    void importLibrary("maps").then(({ Map }) => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new Map(containerRef.current, {
        center: currentPosition ?? destination ?? { lat: 35.681236, lng: 139.767125 },
        zoom: 13,
        disableDefaultUI: true,
        styles: DARK_MAP_STYLE,
      });
      setMapReady(true);
    });

    return () => {
      cancelled = true;
    };
    // 初回マウント時にのみ地図を生成する（以後の中心移動/マーカー更新は別のeffectで行う）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;
    mapRef.current.panTo(currentPosition);
    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: currentPosition,
        title: "現在地",
      });
    } else {
      currentMarkerRef.current.setPosition(currentPosition);
    }
  }, [currentPosition, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !destination || destinationMarkerRef.current) return;
    destinationMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: destination,
      title: "目的地",
    });
  }, [destination, mapReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!waypoint) {
      waypointMarkerRef.current?.setMap(null);
      waypointMarkerRef.current = null;
      return;
    }
    if (!waypointMarkerRef.current) {
      waypointMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: waypoint,
        label: "経由",
        title: "経由地",
      });
    } else {
      waypointMarkerRef.current.setPosition(waypoint);
    }
  }, [waypoint, mapReady]);

  // ルートプレビュー用: 経由地がある間は現在地・経由地・目的地の3点が収まるよう表示範囲を合わせる
  useEffect(() => {
    if (!mapRef.current || !waypoint) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(waypoint);
    if (currentPosition) bounds.extend(currentPosition);
    if (destination) bounds.extend(destination);
    mapRef.current.fitBounds(bounds, 32);
  }, [waypoint, currentPosition, destination, mapReady]);

  if (!isGoogleMapsConfigured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-outline bg-surface-raised-1 text-on-surface-muted">
        <p className="text-sm">Google Maps APIキーが未設定です。</p>
        <p className="text-xs">SETUP.mdの手順でAPIキーを設定してください。</p>
        {currentPosition && (
          <p className="text-xs tabular-nums">
            現在地: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
          </p>
        )}
        {destination && (
          <p className="text-xs tabular-nums">
            目的地: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
          </p>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className="flex-1 rounded-2xl border border-outline" />;
}
