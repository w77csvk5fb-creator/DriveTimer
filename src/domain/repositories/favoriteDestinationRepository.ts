import type { GeoPoint } from "@/domain/entities/geoPoint";
import type { FavoriteDestination, FavoriteLabel } from "@/domain/entities/favoriteDestination";

export interface SaveFavoriteDestinationInput {
  readonly label: FavoriteLabel;
  readonly customLabel: string | null;
  readonly name: string;
  readonly address: string | null;
  readonly point: GeoPoint;
}

/** V1はFirestore実装のみ。将来の別バックエンド移行時もこのインターフェースにのみ依存する。 */
export interface FavoriteDestinationRepository {
  listFavorites(): Promise<readonly FavoriteDestination[]>;
  saveFavorite(input: SaveFavoriteDestinationInput): Promise<FavoriteDestination>;
  deleteFavorite(id: string): Promise<void>;
}
