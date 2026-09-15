import { createServer } from 'vite';

export default async function globalSetup() {
  Object.assign(process.env, {
    VITE_USE_EMULATORS: 'true',
    VITE_FIREBASE_API_KEY: 'demo-key',
    VITE_FIREBASE_PROJECT_ID: 'demo-portfolio',
    VITE_FIREBASE_AUTH_DOMAIN: 'demo-portfolio.firebaseapp.com',
    VITE_FIREBASE_APP_ID: '1:123:web:demo',
    VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: '',
    VITE_RESUME_URL: '',
  });
  const server = await createServer({
    server: { host: '127.0.0.1', port: 3100, strictPort: true },
    logLevel: 'warn',
  });
  await server.listen();
  return async () => { await server.close(); };
}
