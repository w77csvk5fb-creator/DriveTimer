import type { LocationError } from "@/domain/repositories/locationRepository";

interface LocationErrorBannerProps {
  readonly error: LocationError;
}

export function LocationErrorBanner({ error }: LocationErrorBannerProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-accent-urgent/40 bg-accent-urgent/10 px-3 py-2 text-center text-sm text-accent-urgent">
      <span>{error.message}</span>
      {error.reason === "permissionDenied" && (
        <span className="text-xs text-on-surface-muted">
          ブラウザの設定から位置情報の利用を許可してください。
        </span>
      )}
    </div>
  );
}
