import { NextRequest, NextResponse } from "next/server";
import { isServerKeyConfigured, serverEnv } from "@/core/config/env";

const NOT_CONFIGURED_RESPONSE = {
  error: "not_configured",
  message: "GOOGLE_DIRECTIONS_API_KEYが設定されていません。SETUP.mdを参照してください。",
} as const;

/**
 * Google Directions APIへのサーバー側プロキシ。traffic-aware ETA取得・最短ルート取得の
 * 両方で共用する(departure_time=nowを常に付けるため、レスポンスには常にduration_in_trafficが含まれる)。
 * APIキーはここでのみ参照し、クライアントには一切送出しない。
 */
export async function GET(request: NextRequest) {
  if (!isServerKeyConfigured(serverEnv.googleDirectionsApiKey)) {
    return NextResponse.json(NOT_CONFIGURED_RESPONSE, { status: 501 });
  }

  const origin = request.nextUrl.searchParams.get("origin");
  const destination = request.nextUrl.searchParams.get("destination");
  if (!origin || !destination) {
    return NextResponse.json(
      { error: "origin and destination are required" },
      { status: 400 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("departure_time", "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("language", "ja");
  url.searchParams.set("key", serverEnv.googleDirectionsApiKey as string);

  // 景観ルート提案用: waypointを"via:"接頭辞付きで渡すことで、経由地扱い(2レグに分割)ではなく
  // 単一ルート・単一legのまま通過点として扱わせる（既存コードのlegs[0]前提を壊さないため重要）。
  const waypoint = request.nextUrl.searchParams.get("waypoint");
  if (waypoint) {
    url.searchParams.set("waypoints", `via:${waypoint}`);
  }
  if (request.nextUrl.searchParams.get("avoidHighways") === "1") {
    url.searchParams.set("avoid", "highways");
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    return NextResponse.json({ error: "directions_api_error" }, { status: 502 });
  }
  return NextResponse.json(await response.json());
}
