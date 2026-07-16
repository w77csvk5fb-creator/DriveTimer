"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import { clientEnv, isGoogleMapsConfigured } from "@/core/config/env";
import { bearingBetween, haversineDistanceMeters } from "@/core/utils/geoUtils";

// GPSノイズで進行方向が細かく振動しないよう、これ未満の移動では方位を更新しない
const MIN_HEADING_UPDATE_DISTANCE_METERS = 5;
const FOLLOW_ZOOM = 17;
const FOLLOW_TILT = 45;

interface MapViewProps {
  readonly currentPosition: GeoPoint | null;
  readonly destination: GeoPoint | null;
  /** 指定時、経由地マーカーを表示し、3点が収まるよう表示範囲を自動調整する(ルートプレビュー用)。 */
  readonly waypoint?: GeoPoint | null;
  /** エンコード済みポリライン。指定時、現在地から目的地までの経路を線で描画する。 */
  readonly routePolyline?: string | null;
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
export function MapView({
  currentPosition,
  destination,
  waypoint,
  routePolyline,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const waypointMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const lastHeadingPositionRef = useRef<GeoPoint | null>(null);
  const lastHeadingRef = useRef(0);
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

    // 実ナビ同様、走行中(プレビューではない)は現在地に寄って進行方向へ回転させ、
    // 現在地マーカーも進行方向を指す矢印にする
    if (!waypoint) {
      mapRef.current.setZoom(FOLLOW_ZOOM);
      mapRef.current.setTilt(FOLLOW_TILT);
      const lastPosition = lastHeadingPositionRef.current;
      if (
        lastPosition &&
        haversineDistanceMeters(lastPosition, currentPosition) >= MIN_HEADING_UPDATE_DISTANCE_METERS
      ) {
        lastHeadingRef.current = bearingBetween(lastPosition, currentPosition);
        mapRef.current.setHeading(lastHeadingRef.current);
      }
      lastHeadingPositionRef.current = currentPosition;

      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        rotation: lastHeadingRef.current,
        scale: 6,
        fillColor: "#4c9a6a",
        fillOpacity: 1,
        strokeColor: "#0b0c0e",
        strokeWeight: 2,
      };
      if (!currentMarkerRef.current) {
        currentMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: currentPosition,
          title: "現在地",
          icon,
        });
      } else {
        currentMarkerRef.current.setPosition(currentPosition);
        currentMarkerRef.current.setIcon(icon);
      }
      return;
    }

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: currentPosition,
        title: "現在地",
      });
    } else {
      currentMarkerRef.current.setPosition(currentPosition);
    }
  }, [currentPosition, mapReady, waypoint]);

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

  useEffect(() => {
    if (!mapRef.current) return;
    if (!routePolyline) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }
    let cancelled = false;
    void importLibrary("geometry").then(({ encoding }) => {
      if (cancelled || !mapRef.current) return;
      const path = encoding.decodePath(routePolyline);
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          map: mapRef.current,
          path,
          strokeColor: "#4c7093",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
      } else {
        polylineRef.current.setPath(path);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routePolyline, mapReady]);

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
