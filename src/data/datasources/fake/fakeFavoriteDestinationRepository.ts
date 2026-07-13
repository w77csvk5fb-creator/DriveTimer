import type {
  FavoriteDestinationRepository,
  SaveFavoriteDestinationInput,
} from "@/domain/repositories/favoriteDestinationRepository";
import type { FavoriteDestination } from "@/domain/entities/favoriteDestination";

/** テスト・将来のコンポーネントテスト用のインメモリ実装。 */
export class FakeFavoriteDestinationRepository implements FavoriteDestinationRepository {
  private readonly favorites = new Map<string, FavoriteDestination>();
  private nextId = 1;

  async listFavorites(): Promise<readonly FavoriteDestination[]> {
    return [...this.favorites.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  async saveFavorite(input: SaveFavoriteDestinationInput): Promise<FavoriteDestination> {
    const now = new Date();
    const favorite: FavoriteDestination = {
      id: `fake-${this.nextId++}`,
      label: input.label,
      customLabel: input.customLabel,
      name: input.name,
      address: input.address,
      point: input.point,
      createdAt: now,
      updatedAt: now,
    };
    this.favorites.set(favorite.id, favorite);
    return favorite;
  }

  async deleteFavorite(id: string): Promise<void> {
    this.favorites.delete(id);
  }
}
