"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { GeoPoint } from "@/domain/entities/geoPoint";
import { clientEnv, isGoogleMapsConfigured } from "@/core/config/env";
import { bearingBetween, haversineDistanceMeters } from "@/core/utils/geoUtils";
import { useSettingsStore, type MapThemeMode } from "@/presentation/stores/settingsStore";

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
  /** 到着保証モード等、緊急度の高い状態であることを示す。枠を強調し最低高さを確保する。 */
  readonly criticalMode?: boolean;
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

// 明るいテーマ。標準の地図色に近いが、POI/交通機関ラベルは他テーマと同様に間引く。
const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const THEME_OPTIONS: ReadonlyArray<{ value: MapThemeMode; emoji: string; labelJa: string }> = [
  { value: "dark", emoji: "🌙", labelJa: "ダーク" },
  { value: "light", emoji: "☀️", labelJa: "ライト" },
  { value: "satellite", emoji: "🛰️", labelJa: "航空写真" },
];

function applyTheme(map: google.maps.Map, theme: MapThemeMode) {
  if (theme === "satellite") {
    map.setMapTypeId(google.maps.MapTypeId.HYBRID);
    return;
  }
  map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  map.setOptions({ styles: theme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE });
}

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
  criticalMode = false,
}: MapViewProps) {
  const mapTheme = useSettingsStore((s) => s.mapTheme);
  const setMapTheme = useSettingsStore((s) => s.setMapTheme);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const currentMarkerGlowRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const waypointMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineGlowRef = useRef<google.maps.Polyline | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const lastHeadingPositionRef = useRef<GeoPoint | null>(null);
  const lastHeadingRef = useRef(0);
  // 地図オブジェクトの生成は非同期。生成完了前にdestination等が確定済みだと、
  // それらのprop自体は二度と変化せず対応するeffectが再実行されないままになるため、
  // 生成完了を状態として持ち、他の全effectの依存配列に加えて再評価を強制する。
  const [mapReady, setMapReady] = useState(false);
  // ユーザーがピンチ/ドラッグで地図を操作した間は自動追従を止める。
  // 自分自身のpanTo/setZoom呼び出しをユーザー操作と誤検知しないためのフラグ。
  const isProgrammaticUpdateRef = useRef(false);
  const [following, setFollowing] = useState(true);

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
        // 回転はユーザーが操作できるよう有効化する。rotateControlは45度航空写真が
        // 利用可能な地域でしか表示されないため、gestureHandlingで2本指回転ジェスチャー
        // 自体も常に効くようにしておく(モバイルでの主な操作手段)。
        rotateControl: true,
        rotateControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: "greedy",
      });
      applyTheme(mapRef.current, mapTheme);
      mapRef.current.addListener("dragstart", () => {
        if (!isProgrammaticUpdateRef.current) setFollowing(false);
      });
      mapRef.current.addListener("zoom_changed", () => {
        if (!isProgrammaticUpdateRef.current) setFollowing(false);
      });
      setMapReady(true);
    });

    return () => {
      cancelled = true;
    };
    // 初回マウント時にのみ地図を生成する（以後の中心移動/マーカー更新は別のeffectで行う）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // テーマ切り替え(ユーザー操作による設定変更)を既存の地図インスタンスへ反映する。
  useEffect(() => {
    if (!mapRef.current) return;
    applyTheme(mapRef.current, mapTheme);
  }, [mapTheme, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;

    // 実ナビ同様、走行中(プレビューではない)は現在地に寄って進行方向へ回転させ、
    // 現在地マーカーも進行方向を指す矢印にする
    if (!waypoint) {
      // 進行方向は追従が止まっていても(矢印マーカーのため)常に更新する
      const lastPosition = lastHeadingPositionRef.current;
      if (
        lastPosition &&
        haversineDistanceMeters(lastPosition, currentPosition) >= MIN_HEADING_UPDATE_DISTANCE_METERS
      ) {
        lastHeadingRef.current = bearingBetween(lastPosition, currentPosition);
      }
      lastHeadingPositionRef.current = currentPosition;

      // カメラの追従(パン・ズーム・傾き・回転)はユーザーが手動操作していない間だけ行う
      if (following) {
        isProgrammaticUpdateRef.current = true;
        mapRef.current.panTo(currentPosition);
        mapRef.current.setZoom(FOLLOW_ZOOM);
        mapRef.current.setTilt(FOLLOW_TILT);
        mapRef.current.setHeading(lastHeadingRef.current);
        setTimeout(() => {
          isProgrammaticUpdateRef.current = false;
        }, 0);
      }

      // 本体の下にひと回り大きい半透明のシアン円を重ね、グローのような立体感を出す。
      const glowIcon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: "#00e5ff",
        fillOpacity: 0.25,
        strokeWeight: 0,
      };
      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        rotation: lastHeadingRef.current,
        scale: 6.5,
        fillColor: "#00e5ff",
        fillOpacity: 1,
        strokeColor: "#0b0f14",
        strokeWeight: 2,
      };
      if (!currentMarkerGlowRef.current) {
        currentMarkerGlowRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: currentPosition,
          icon: glowIcon,
          zIndex: 1,
          clickable: false,
        });
      } else {
        currentMarkerGlowRef.current.setPosition(currentPosition);
      }
      if (!currentMarkerRef.current) {
        currentMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: currentPosition,
          title: "現在地",
          icon,
          zIndex: 2,
        });
      } else {
        currentMarkerRef.current.setPosition(currentPosition);
        currentMarkerRef.current.setIcon(icon);
      }
      return;
    }

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
  }, [currentPosition, mapReady, waypoint, following]);

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
      polylineGlowRef.current?.setMap(null);
      polylineGlowRef.current = null;
      return;
    }
    let cancelled = false;
    void importLibrary("geometry").then(({ encoding }) => {
      if (cancelled || !mapRef.current) return;
      const path = encoding.decodePath(routePolyline);
      // 太く薄いシアンの線を下に敷き、その上に本線を重ねてグローのような立体感を出す。
      if (!polylineGlowRef.current) {
        polylineGlowRef.current = new google.maps.Polyline({
          map: mapRef.current,
          path,
          strokeColor: "#00e5ff",
          strokeOpacity: 0.25,
          strokeWeight: 11,
          zIndex: 1,
        });
      } else {
        polylineGlowRef.current.setPath(path);
      }
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          map: mapRef.current,
          path,
          strokeColor: "#4c7093",
          strokeOpacity: 0.95,
          strokeWeight: 5,
          zIndex: 2,
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

  return (
    <div
      className={`relative flex flex-1 ${criticalMode ? "min-h-[280px]" : ""}`}
    >
      <div
        ref={containerRef}
        className={`flex-1 rounded-2xl border-2 bg-surface-raised-1 ${
          criticalMode
            ? "border-accent-urgent shadow-lg shadow-accent-urgent/30"
            : "border-outline"
        }`}
      />
      <div className="absolute left-3 top-3 flex gap-1 rounded-full border border-outline bg-surface-raised-1/90 p-1 shadow-lg">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMapTheme(option.value)}
            title={option.labelJa}
            className={`rounded-full px-2 py-1 text-sm ${
              mapTheme === option.value ? "pill-selected" : ""
            }`}
          >
            {option.emoji}
          </button>
        ))}
      </div>
      {!waypoint && !following && (
        <button
          type="button"
          onClick={() => setFollowing(true)}
          className="absolute bottom-3 right-3 rounded-full border border-outline bg-surface-raised-1 px-3 py-2 text-sm font-semibold text-on-surface shadow-lg"
        >
          📍 現在地に戻る
        </button>
      )}
    </div>
  );
}
