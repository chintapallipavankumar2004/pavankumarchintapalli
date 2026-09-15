# Portfolio Firebase setup

The public portfolio works without Firebase and shows the built-in Coffee Hub project. Admin CRUD becomes available after the following setup.

1. Create or select a Firebase project. In Authentication, enable Email/Password. Do not enable public registration in the app.
2. Create the owner account in Firebase Console → Authentication → Users → Add user.
3. Copy `.env.example` to `.env.local` and fill the six web-app configuration values. These identify the Firebase project and are safe for browser use; authorization is enforced by rules.
4. Assign the account an `admin: true` custom claim from a trusted Admin SDK environment. Never run the Admin SDK or store a service account in this frontend repository. Example trusted script:

   ```js
   import admin from "firebase-admin";
   admin.initializeApp({ credential: admin.credential.applicationDefault() });
   await admin.auth().setCustomUserClaims("PASTE_AUTH_UID_HERE", { admin: true });
   ```

5. Sign out and sign in again so Firebase issues a token containing the new claim.
6. Deploy the rules and indexes from an authenticated Firebase CLI: `firebase deploy --only firestore:rules,firestore:indexes,storage`.
7. Open `/admin/login`, sign in, and create the Coffee Hub record (or the next project). The public site uses the local Coffee Hub seed until Firestore contains at least one published project.

To add a website, poster, logo, automation, or app: open `/admin/projects/new`, choose the category and status, enter factual copy, add a cover image and alt text, add optional gallery images, save as a draft, review the preview, then enable Published and save. Public filter tabs appear only when their category has at least one published project.

For local rules testing, install Firebase CLI outside this repository, start the Authentication, Firestore, and Storage emulators, and point the client SDK to them in a development-only branch before running CRUD tests. No production credentials or service-account JSON should be committed.
