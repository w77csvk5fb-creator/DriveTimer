"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoPoint } from "@/domain/entities/geoPoint";

export interface SelectedDestination {
  readonly name: string;
  readonly point: GeoPoint;
}

interface Suggestion {
  readonly placeId: string;
  readonly text: string;
}

interface PlacesAutocompleteResponse {
  readonly suggestions?: ReadonlyArray<{
    readonly placePrediction?: {
      readonly placeId: string;
      readonly text?: { readonly text: string };
    };
  }>;
}

interface PlaceDetailsResponse {
  readonly displayName?: { readonly text: string };
  readonly location?: { readonly latitude: number; readonly longitude: number };
}

interface DestinationSearchFieldProps {
  readonly onSelect: (destination: SelectedDestination) => void;
  /** お気に入り等、検索以外の経路で選択された目的地名。検索欄の表示に反映する。 */
  readonly selectedDestinationName?: string;
}

/** Google Places API (New) を /api/places プロキシ経由で叩く目的地検索フィールド。 */
export function DestinationSearchField({
  onSelect,
  selectedDestinationName,
}: DestinationSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([]);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 選択確定によりqueryを表示名へ書き換えた際、それを新規検索としては扱わないための目印
  const [lastSelectedName, setLastSelectedName] = useState<string | undefined>(undefined);
  const [syncedName, setSyncedName] = useState(selectedDestinationName);

  if (selectedDestinationName !== syncedName) {
    setSyncedName(selectedDestinationName);
    if (selectedDestinationName !== undefined && selectedDestinationName !== query) {
      setLastSelectedName(selectedDestinationName);
      setQuery(selectedDestinationName);
      setSuggestions([]);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query === lastSelectedName) {
      return;
    }

    if (query.trim().length < 2) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/places?input=${encodeURIComponent(query)}`);
          if (res.status === 501) {
            setNotConfigured(true);
            setSuggestions([]);
            return;
          }
          if (!res.ok) {
            setSuggestions([]);
            return;
          }
          const data = (await res.json()) as PlacesAutocompleteResponse;
          const items: Suggestion[] = (data.suggestions ?? [])
            .map((s) => s.placePrediction)
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({ placeId: p.placeId, text: p.text?.text ?? "" }));
          setSuggestions(items);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, lastSelectedName]);

  const handleSelect = async (suggestion: Suggestion) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/places?placeId=${encodeURIComponent(suggestion.placeId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as PlaceDetailsResponse;
      if (!data.location) return;
      const name = data.displayName?.text ?? suggestion.text;
      onSelect({ name, point: { lat: data.location.latitude, lng: data.location.longitude } });
      setLastSelectedName(name);
      setQuery(name);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const visibleSuggestions = query.trim().length < 2 ? [] : suggestions;

  if (notConfigured) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-outline bg-surface-raised-1 p-3 text-sm text-on-surface-muted">
        <p>Google Places APIキーが未設定のため、目的地検索は利用できません。</p>
        <p>SETUP.mdの手順でAPIキーを設定するか、シミュレーションモードをお試しください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-on-surface-muted" htmlFor="destination-search">
        目的地
      </label>
      <input
        id="destination-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="目的地を検索"
        className="rounded-xl border border-outline bg-surface-raised-1 px-3 py-2 text-on-surface"
      />
      {loading && <p className="text-xs text-on-surface-muted">検索中…</p>}
      {visibleSuggestions.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-outline bg-surface-raised-1 p-1">
          {visibleSuggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => void handleSelect(s)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-on-surface hover:bg-surface-raised-2"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
