<<<<<<< HEAD
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

=======
>>>>>>> 0949a13 (changes)
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
<<<<<<< HEAD
export const firebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);
const app = firebaseConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
// Memory-only cache: admin drafts/enquiries are never persisted to the device.
export const db = app ? initializeFirestore(app, {}) : null;
// Development-only emulator switch. Never included as an enabled production path.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_EMULATORS === 'true' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  auth &&
  db
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
if (
  import.meta.env.DEV &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  import.meta.env.VITE_APPCHECK_DEBUG_TOKEN
) {
  (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
}
const appCheck =
  app && import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
    ? initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(
          import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY,
        ),
        isTokenAutoRefreshEnabled: true,
      })
    : null;
export async function appCheckToken() {
  if (!appCheck)
    throw new Error('Enquiries are temporarily unavailable. Please use the email link.');
  return (await getToken(appCheck)).token;
=======

export const firebaseConfigured = Object.values(config).every(Boolean);
export let db: import("firebase/firestore").Firestore | undefined;
export let storage: import("firebase/storage").FirebaseStorage | undefined;
let servicesPromise: Promise<{
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
  storage: import("firebase/storage").FirebaseStorage;
}> | null;

export function getFirebaseServices() {
  if (!firebaseConfigured) return Promise.resolve(null);
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
      import("firebase/storage"),
    ]).then(([appModule, authModule, firestoreModule, storageModule]) => {
      const app = appModule.getApps()[0] || appModule.initializeApp(config);
      db = firestoreModule.getFirestore(app);
      storage = storageModule.getStorage(app);
      return {
        auth: authModule.getAuth(app),
        db,
        storage,
      };
    });
  }
  return servicesPromise;
>>>>>>> 0949a13 (changes)
}
