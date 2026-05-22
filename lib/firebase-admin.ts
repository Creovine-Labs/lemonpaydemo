import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

const APP_NAME = "lemonpay-admin";

/**
 * Lazy Admin SDK init.
 *
 * Build-time tools (Next page-data collection on App Hosting) import this
 * module without runtime env vars present. Eager init at module load would
 * crash the build. We expose `adminAuth`, `adminDb`, and `adminStorage` as
 * Proxies that only initialize on first property access — which happens at
 * request time, where the env vars are guaranteed to be set.
 */

let _app: App | null = null;
function getApp(): App {
  if (_app) return _app;

  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    _app = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      "Missing Firebase Admin credentials. Check FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in the " +
        "runtime environment (Secret Manager for production deploys).",
    );
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  _app = initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    APP_NAME,
  );
  return _app;
}

function lazyProxy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const target = getter();
      const value = (target as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
    has(_target, prop) {
      return prop in getter();
    },
    ownKeys() {
      return Reflect.ownKeys(getter());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(getter(), prop);
    },
  });
}

export const adminAuth: Auth = lazyProxy<Auth>(() => getAuth(getApp()));
export const adminDb: Firestore = lazyProxy<Firestore>(() => getFirestore(getApp()));
export const adminStorage: Storage = lazyProxy<Storage>(() => getStorage(getApp()));

// FieldValue / Timestamp are static — no app needed.
export { FieldValue, Timestamp } from "firebase-admin/firestore";
