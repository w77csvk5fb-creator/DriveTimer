import { NextRequest, NextResponse } from "next/server";
import { isServerKeyConfigured, serverEnv } from "@/core/config/env";

interface PlacesAutocompleteResponse {
  readonly suggestions?: ReadonlyArray<{
    readonly placePrediction?: {
      readonly placeId: string;
      readonly text?: { readonly text: string };
    };
  }>;
}

const NOT_CONFIGURED_RESPONSE = {
  error: "not_configured",
  message: "GOOGLE_PLACES_API_KEYが設定されていません。SETUP.mdを参照してください。",
} as const;

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
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({ input, languageCode: "ja", regionCode: "JP" }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "places_api_error" }, { status: 502 });
    }
    const data = (await response.json()) as PlacesAutocompleteResponse;
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "input or placeId is required" }, { status: 400 });
}
