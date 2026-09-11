const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const env = { ...process.env, FIREBASE_EMULATORS_PATH: path.resolve('.cache/firebase-emulators') };
// The CLI treats any inherited DEBUG value as verbose mode, including env dumps.
delete env.DEBUG;
if (process.platform === 'win32') {
  const javaPaths = [
    process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, 'bin'),
    'C:/Program Files/Java/jdk-23/bin',
    'C:/Program Files/Android/Android Studio/jbr/bin',
  ].filter(Boolean);
  const javaBin = javaPaths.find((dir) => existsSync(path.join(dir, 'java.exe')));
  if (javaBin) env.PATH = `${javaBin}${path.delimiter}${env.PATH}`;
}
const browser = process.argv.includes('--browser');
const result = spawnSync(
  process.execPath,
  [
    'node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:exec',
    '--project',
    'demo-portfolio',
    '--only',
    browser ? 'auth,firestore' : 'firestore',
    browser ? 'npx playwright test' : 'npm run test:rules:run',
  ],
  { stdio: 'inherit', env, windowsHide: true },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
