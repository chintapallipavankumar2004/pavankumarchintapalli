import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
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
const appCheck = app && import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
  ? initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY), isTokenAutoRefreshEnabled: true }) : null;
export async function appCheckToken() {
  if (!appCheck) throw new Error('Enquiries are temporarily unavailable. Please use the email link.');
  return (await getToken(appCheck)).token;
}
