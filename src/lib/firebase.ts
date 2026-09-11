import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const firebaseConfigured = Object.values(config).every(Boolean);
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
}
