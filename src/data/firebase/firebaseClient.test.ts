import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("firebaseClient", () => {
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

  it("returns null for app/auth/firestore and resolves null auth when Firebase env vars are not configured", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const initializeApp = vi.fn();
    vi.doMock("firebase/app", () => ({ initializeApp, getApps: () => [] }));
    vi.doMock("firebase/auth", () => ({ getAuth: vi.fn(), signInAnonymously: vi.fn() }));
    vi.doMock("firebase/firestore", () => ({ getFirestore: vi.fn() }));

    const mod = await import("./firebaseClient");
    expect(mod.getFirebaseApp()).toBeNull();
    expect(mod.getFirebaseAuth()).toBeNull();
    expect(mod.getFirebaseFirestore()).toBeNull();
    expect(await mod.ensureAnonymousAuth()).toBeNull();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("initializes the app and signs in anonymously exactly once when configured", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "app.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "proj";

    const fakeApp = { name: "[DEFAULT]" };
    const fakeAuth = { currentUser: null };
    const fakeFirestore = {};
    const initializeApp = vi.fn().mockReturnValue(fakeApp);
    const getApps = vi.fn().mockReturnValue([]);
    const getAuth = vi.fn().mockReturnValue(fakeAuth);
    const signInAnonymously = vi.fn().mockResolvedValue({ user: { uid: "uid-123" } });
    const getFirestore = vi.fn().mockReturnValue(fakeFirestore);

    vi.doMock("firebase/app", () => ({ initializeApp, getApps }));
    vi.doMock("firebase/auth", () => ({ getAuth, signInAnonymously }));
    vi.doMock("firebase/firestore", () => ({ getFirestore }));

    const mod = await import("./firebaseClient");
    expect(mod.getFirebaseApp()).toBe(fakeApp);
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(mod.getFirebaseAuth()).toBe(fakeAuth);
    expect(mod.getFirebaseFirestore()).toBe(fakeFirestore);

    expect(await mod.ensureAnonymousAuth()).toBe("uid-123");
    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    // 2回目の呼び出しでは再度signInAnonymouslyを呼ばない（メモ化されたPromiseを再利用する）
    expect(await mod.ensureAnonymousAuth()).toBe("uid-123");
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
