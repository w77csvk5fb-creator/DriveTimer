import { NextRequest, NextResponse } from "next/server";
import { isServerKeyConfigured, serverEnv } from "@/core/config/env";

interface PlacesAutocompleteResponse {
  readonly suggestions?: ReadonlyArray<{
    readonly placePrediction?: {
      readonly placeId: string;
      readonly text?: { readonly text: string };
      /** originを指定した場合のみ返る直線距離(m)。ルート系の予測やごく近距離では省略される。 */
      readonly distanceMeters?: number;
    };
  }>;
}

const NOT_CONFIGURED_RESPONSE = {
  error: "not_configured",
  message: "GOOGLE_PLACES_API_KEYが設定されていません。SETUP.mdを参照してください。",
} as const;

/** locationBiasの半径(m)。Places API (New) の circle.radius 上限は50,000m。 */
const LOCATION_BIAS_RADIUS_METERS = 50_000;

/**
 * Google Places API (New) へのサーバー側プロキシ。
 * ?input=... で候補検索(Autocomplete)、?placeId=... で詳細(座標)取得を行う。
 * APIキーはここでのみ参照し、クライアントには一切送出しない。
 */
export async function GET(request: NextRequest) {
  if (!isServerKeyConfigured(serverEnv.googlePlacesApiKey)) {
    return NextResponse.json(NOT_CONFIGURED_RESPONSE, { status: 501 });
  }
  const apiKey = serverEnv.googlePlacesApiKey as string;

  const placeId = request.nextUrl.searchParams.get("placeId");
  if (placeId) {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "location,displayName,formattedAddress",
        },
      },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "places_api_error" }, { status: 502 });
    }
    return NextResponse.json(await response.json());
  }

  const input = request.nextUrl.searchParams.get("input");
  if (input) {
    // 現在地が分かる場合は近傍を優先(locationBias)しつつ、origin指定で返る
    // distanceMeters(現在地からの直線距離)を使って実際に近い順へ並び替える。
    // locationBiasだけでは関連性スコアへの「優先」に過ぎず、厳密な距離順にはならないため。
    const lat = request.nextUrl.searchParams.get("lat");
    const lng = request.nextUrl.searchParams.get("lng");
    const origin =
      lat && lng ? { latitude: Number(lat), longitude: Number(lng) } : undefined;
    const locationBias = origin
      ? { circle: { center: origin, radius: LOCATION_BIAS_RADIUS_METERS } }
      : undefined;

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({ input, languageCode: "ja", regionCode: "JP", locationBias, origin }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "places_api_error" }, { status: 502 });
    }
    const data = (await response.json()) as PlacesAutocompleteResponse;
    if (!origin || !data.suggestions) {
      return NextResponse.json(data);
    }
    // distanceMeters未指定(ルート予測、または1m未満)の候補は末尾に回す
    const sorted = [...data.suggestions].sort((a, b) => {
      const da = a.placePrediction?.distanceMeters ?? Number.POSITIVE_INFINITY;
      const db = b.placePrediction?.distanceMeters ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return NextResponse.json({ ...data, suggestions: sorted });
  }

  return NextResponse.json({ error: "input or placeId is required" }, { status: 400 });
}
