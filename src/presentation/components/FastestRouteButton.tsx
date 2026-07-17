"use client";

import { useActiveDriveStore } from "@/presentation/stores/activeDriveStore";
import { buildGoogleMapsDirectionsUrl } from "@/core/utils/googleMapsLink";
import { formatDurationJa } from "@/core/utils/durationFormatter";

/** 到着保証モード時に表示する「最短ルートへ変更」ボタン。景観等は考慮せず最速ルートのみを提示する。 */
export function FastestRouteButton() {
  const currentPosition = useActiveDriveStore((s) => s.currentPosition);
  const destination = useActiveDriveStore((s) => s.destination);
  const fastestRoute = useActiveDriveStore((s) => s.fastestRoute);
  const fastestRouteLoading = useActiveDriveStore((s) => s.fastestRouteLoading);
  const fetchFastestRoute = useActiveDriveStore((s) => s.fetchFastestRoute);

  const mapsUrl =
    currentPosition && destination
      ? buildGoogleMapsDirectionsUrl(currentPosition, destination)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void fetchFastestRoute()}
        disabled={fastestRouteLoading}
        className="btn-danger-gradient w-full rounded-2xl px-4 py-3 text-lg font-bold text-on-surface disabled:opacity-60"
      >
        {fastestRouteLoading ? "検索中…" : "最短ルートへ変更"}
      </button>
      {fastestRoute && (
        <p className="text-center text-sm text-on-surface-muted">
          最短ルートで目的地まで約{formatDurationJa(fastestRoute.durationMs)}
        </p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm text-accent-primary underline"
        >
          Google Mapsで開く
        </a>
      )}
    </div>
  );
}
