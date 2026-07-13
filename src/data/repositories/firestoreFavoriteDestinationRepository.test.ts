import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function mockFirebaseModules(overrides?: {
  uid?: string;
  docs?: ReadonlyArray<{ id: string; data: Record<string, unknown> }>;
}) {
  const fakeApp = { name: "[DEFAULT]" };
  const fakeAuth = { currentUser: null };
  const fakeFirestore = {};
  const uid = overrides?.uid ?? "uid-123";

  vi.doMock("firebase/app", () => ({
    initializeApp: vi.fn().mockReturnValue(fakeApp),
    getApps: vi.fn().mockReturnValue([]),
  }));
  vi.doMock("firebase/auth", () => ({
    getAuth: vi.fn().mockReturnValue(fakeAuth),
    signInAnonymously: vi.fn().mockResolvedValue({ user: { uid } }),
  }));

  const getFirestore = vi.fn().mockReturnValue(fakeFirestore);
  const collection = vi.fn().mockReturnValue("collectionRef");
  const doc = vi.fn().mockReturnValue("docRef");
  const query = vi.fn().mockReturnValue("queryRef");
  const orderBy = vi.fn().mockReturnValue("orderByClause");
  const serverTimestamp = vi.fn().mockReturnValue("SERVER_TIMESTAMP");
  const addDoc = vi.fn().mockResolvedValue({ id: "new-doc-id" });
  const deleteDoc = vi.fn().mockResolvedValue(undefined);
  const getDocs = vi.fn().mockResolvedValue({
    docs: (overrides?.docs ?? []).map((d) => ({ id: d.id, data: () => d.data })),
  });

  vi.doMock("firebase/firestore", () => ({
    getFirestore,
    collection,
    doc,
    query,
    orderBy,
    serverTimestamp,
    addDoc,
    deleteDoc,
    getDocs,
  }));

  return { getFirestore, collection, doc, query, orderBy, serverTimestamp, addDoc, deleteDoc, getDocs };
}

function configureFirebaseEnv() {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key";
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "app.firebaseapp.com";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "proj";
}

function unconfigureFirebaseEnv() {
  delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

describe("FirestoreFavoriteDestinationRepository", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock("firebase/app");
    vi.doUnmock("firebase/auth");
    vi.doUnmock("firebase/firestore");
  });

  it("listFavorites returns [] when Firebase is not configured, without touching Firestore", async () => {
    unconfigureFirebaseEnv();
    const { getDocs } = mockFirebaseModules();

    const { FirestoreFavoriteDestinationRepository } = await import(
      "./firestoreFavoriteDestinationRepository"
    );
    const repo = new FirestoreFavoriteDestinationRepository();
    expect(await repo.listFavorites()).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("saveFavorite/deleteFavorite throw FavoritesNotConfiguredError when not configured", async () => {
    unconfigureFirebaseEnv();
    mockFirebaseModules();

    const { FirestoreFavoriteDestinationRepository, FavoritesNotConfiguredError } = await import(
      "./firestoreFavoriteDestinationRepository"
    );
    const repo = new FirestoreFavoriteDestinationRepository();
    await expect(
      repo.saveFavorite({
        label: "home",
        customLabel: null,
        name: "自宅",
        address: null,
        point: { lat: 1, lng: 2 },
      }),
    ).rejects.toThrow(FavoritesNotConfiguredError);
    await expect(repo.deleteFavorite("x")).rejects.toThrow(FavoritesNotConfiguredError);
  });

  it("lists favorites mapped from Firestore docs when configured", async () => {
    configureFirebaseEnv();
    const fixedDate = new Date("2026-07-13T10:00:00Z");
    const { collection, query, orderBy } = mockFirebaseModules({
      docs: [
        {
          id: "doc-1",
          data: {
            label: "home",
            customLabel: null,
            name: "自宅",
            address: "東京都渋谷区",
            lat: 35.66,
            lng: 139.7,
            createdAt: { toDate: () => fixedDate },
            updatedAt: { toDate: () => fixedDate },
          },
        },
      ],
    });

    const { FirestoreFavoriteDestinationRepository } = await import(
      "./firestoreFavoriteDestinationRepository"
    );
    const repo = new FirestoreFavoriteDestinationRepository();
    const favorites = await repo.listFavorites();

    expect(favorites).toEqual([
      {
        id: "doc-1",
        label: "home",
        customLabel: null,
        name: "自宅",
        address: "東京都渋谷区",
        point: { lat: 35.66, lng: 139.7 },
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
    ]);
    expect(collection).toHaveBeenCalledWith(
      expect.anything(),
      "users",
      "uid-123",
      "favoriteDestinations",
    );
    expect(query).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalledWith("createdAt", "asc");
  });

  it("saveFavorite writes the mapped fields to Firestore and returns an optimistic entity", async () => {
    configureFirebaseEnv();
    const { addDoc, collection } = mockFirebaseModules();

    const { FirestoreFavoriteDestinationRepository } = await import(
      "./firestoreFavoriteDestinationRepository"
    );
    const repo = new FirestoreFavoriteDestinationRepository();
    const saved = await repo.saveFavorite({
      label: "work",
      customLabel: null,
      name: "職場",
      address: null,
      point: { lat: 35.68, lng: 139.76 },
    });

    expect(saved.id).toBe("new-doc-id");
    expect(saved.label).toBe("work");
    expect(addDoc).toHaveBeenCalledWith(
      "collectionRef",
      expect.objectContaining({ label: "work", lat: 35.68, lng: 139.76 }),
    );
    expect(collection).toHaveBeenCalledWith(
      expect.anything(),
      "users",
      "uid-123",
      "favoriteDestinations",
    );
  });

  it("deleteFavorite removes the document by id", async () => {
    configureFirebaseEnv();
    const { deleteDoc, doc } = mockFirebaseModules();

    const { FirestoreFavoriteDestinationRepository } = await import(
      "./firestoreFavoriteDestinationRepository"
    );
    const repo = new FirestoreFavoriteDestinationRepository();
    await repo.deleteFavorite("doc-1");

    expect(doc).toHaveBeenCalledWith(
      expect.anything(),
      "users",
      "uid-123",
      "favoriteDestinations",
      "doc-1",
    );
    expect(deleteDoc).toHaveBeenCalledWith("docRef");
  });
});
