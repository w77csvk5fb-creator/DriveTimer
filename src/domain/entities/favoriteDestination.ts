import type { GeoPoint } from "./geoPoint";

export type FavoriteLabel = "home" | "school" | "work" | "custom";

export interface FavoriteDestination {
  readonly id: string;
  readonly label: FavoriteLabel;
  /** label==="custom"の場合のみ意味を持つユーザー入力名 */
  readonly customLabel: string | null;
  readonly name: string;
  readonly address: string | null;
  readonly point: GeoPoint;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
