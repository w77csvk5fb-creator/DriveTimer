import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { ensureAnonymousAuth, getFirebaseFirestore } from "@/data/firebase/firebaseClient";
import { isFirebaseConfigured } from "@/core/config/env";
import type {
  FavoriteDestinationRepository,
  SaveFavoriteDestinationInput,
} from "@/domain/repositories/favoriteDestinationRepository";
import type { FavoriteDestination, FavoriteLabel } from "@/domain/entities/favoriteDestination";

const COLLECTION_NAME = "favoriteDestinations";

export class FavoritesNotConfiguredError extends Error {
  constructor() {
    super("Firebaseが設定されていないため、お気に入りを保存できません。");
    this.name = "FavoritesNotConfiguredError";
  }
}

interface FavoriteDestinationDoc {
  readonly label: FavoriteLabel;
  readonly customLabel: string | null;
  readonly name: string;
  readonly address: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

function toEntity(id: string, data: FavoriteDestinationDoc): FavoriteDestination {
  return {
    id,
    label: data.label,
    customLabel: data.customLabel,
    name: data.name,
    address: data.address,
    point: { lat: data.lat, lng: data.lng },
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

/** V1唯一の実装。Firebase未設定時、読み取りは静かに空配列を返し、書き込みは例外を投げる
 * （UIが書き込み導線自体をisFirebaseConfiguredで隠すため、ここに到達したら実装バグとして検知したい）。 */
export class FirestoreFavoriteDestinationRepository implements FavoriteDestinationRepository {
  async listFavorites(): Promise<readonly FavoriteDestination[]> {
    if (!isFirebaseConfigured) return [];
    const uid = await ensureAnonymousAuth();
    const firestore = getFirebaseFirestore();
    if (!uid || !firestore) return [];

    const snapshot = await getDocs(
      query(collection(firestore, "users", uid, COLLECTION_NAME), orderBy("createdAt", "asc")),
    );
    return snapshot.docs.map((d) => toEntity(d.id, d.data() as FavoriteDestinationDoc));
  }

  async saveFavorite(input: SaveFavoriteDestinationInput): Promise<FavoriteDestination> {
    const uid = await ensureAnonymousAuth();
    const firestore = getFirebaseFirestore();
    if (!uid || !firestore) throw new FavoritesNotConfiguredError();

    const now = serverTimestamp();
    const docRef = await addDoc(collection(firestore, "users", uid, COLLECTION_NAME), {
      label: input.label,
      customLabel: input.customLabel,
      name: input.name,
      address: input.address,
      lat: input.point.lat,
      lng: input.point.lng,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      label: input.label,
      customLabel: input.customLabel,
      name: input.name,
      address: input.address,
      point: input.point,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async deleteFavorite(id: string): Promise<void> {
    const uid = await ensureAnonymousAuth();
    const firestore = getFirebaseFirestore();
    if (!uid || !firestore) throw new FavoritesNotConfiguredError();

    await deleteDoc(doc(firestore, "users", uid, COLLECTION_NAME, id));
  }
}
