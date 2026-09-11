# Portfolio setup and operations

This project keeps the React/Vite/Tailwind presentation and adds Firebase Authentication, Cloud Firestore, and two Vercel Node serverless endpoints. The code alone does not create a Firebase project, deploy rules, register App Check, configure Cloudinary, or supply a resume PDF.

## 1. Requirements and local configuration

- Node.js 22 (22.12+; development validated with 22.22.2).
- A Firebase project, Cloudinary product environment, and Vercel project that you control.
- Java 21+ for emulator tests. On this Windows machine the test runner finds `C:/Program Files/Java/jdk-23/bin`; elsewhere install Java and set `JAVA_HOME`/`PATH`.
- Your actual resume PDF and confirmed project content. The prototype's sample project/enquiry data is not imported.

Run `npm ci` (PowerShell: `npm.cmd ci`). Copy `.env.example` to `.env.local`. Fill values locally or in Vercel's environment settings; do not put secrets in chat, source files, Firestore settings, or Git. `.env.local`, emulator caches, and test artifacts are ignored.

All `VITE_` variables are public browser configuration. `FIREBASE_PRIVATE_KEY`, Cloudinary secrets, and the rate-limit secret are server-only. Do not add a `VITE_` prefix to them. Use separate Firebase/Cloudinary environments for development/preview and production when possible.

## 2. Firebase project and authentication

1. Create/select a project in Firebase Console. Register a Web app in Project Settings → General.
2. Copy the web app's `apiKey`, `authDomain`, `projectId`, and `appId` to the four `VITE_FIREBASE_*` variables. The web API key identifies the project; Firestore rules and Authentication enforce access.
3. Open Authentication → Sign-in method and enable Email/Password. No public registration UI is provided.
4. Create your admin account under Authentication → Users. Use a strong password. Copy its UID; set `FIREBASE_ADMIN_UID` in your local `.env.local`.
5. Add your production domain and any specific preview domains used for testing to Authentication → Settings → Authorized domains. Add localhost only for local authentication development.
6. Create a Cloud Firestore database in production mode, choosing your intended region. Do not enable permissive test-mode rules.
7. In Project Settings → Service accounts, generate a private key for the server environment. Map `project_id`, `client_email`, and `private_key` to `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. They must refer to the same Firebase project as the web configuration. Store the private key with literal `\n` escapes in a quoted environment value. Never commit the downloaded JSON file.
8. The server service account needs Firestore data access (for example Cloud Datastore User), Firebase Authentication access sufficient to verify revoked tokens/read the admin user, and App Check token verification access. Firebase's generated Admin SDK service account usually has the corresponding Firebase service roles; verify IAM permissions in your project. Avoid assigning broad Owner access to new service accounts.
9. Deploy the checked-in rules/index configuration to the intended project:

   ```sh
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   ```

10. Authorize exactly one admin by running `npm run admin:provision`. This validates that the UID exists and is enabled, then writes `access/admin: { uid }` using server credentials. You can instead set this single document manually in the Firebase Console. No browser user, including the admin, can write this grant.
11. Sign in at `/admin`. To transfer admin access, change the UID and rerun the provision command. The grant is checked by Firestore rules and the signer; the UI also observes it. To revoke a compromised login, disable the user/revoke refresh tokens in Firebase and replace/remove the grant. Signed upload authorization verifies revoked ID tokens.

The app uses Firebase local/session authentication persistence according to Remember me. It does not store project/enquiry data in localStorage or IndexedDB. Firestore's client cache is memory-only. Old `pavan_portfolio_*` localStorage entries from the prototype are ignored; they can be removed manually after any content you want has been reviewed.

## 3. App Check and enquiries

1. In Google Cloud reCAPTCHA Enterprise, create a web score-based key for the domains that will serve the app. Enable the required API as prompted.
2. In Firebase Console → App Check, register the Firebase Web app with reCAPTCHA Enterprise and that site key. Put the site key in `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`.
3. Ensure the server service account can verify App Check tokens (Firebase App Check Token Verifier where needed). Set `ENQUIRY_RATE_LIMIT_SECRET` to a random secret generated with at least 32 random bytes; for example `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` on your own machine.
4. Set `ALLOWED_ORIGINS` to exact allowed origins, comma-separated, with no trailing slash: e.g. `https://your-domain.example,https://your-project.vercel.app`. Only add preview origins that you use; do not use a wildcard.
5. For local real-service testing with `vercel dev`, register an App Check debug token in Firebase Console and set `VITE_APPCHECK_DEBUG_TOKEN` in local `.env.local`, plus the normal site key. The debug switch works only in Vite development mode on localhost/127.0.0.1 and is ignored in production. Do not put a debug token in Vercel.
6. Verify production App Check request metrics, then enable Firestore App Check enforcement if desired as an additional defense. Firestore rules are always required. The custom enquiry endpoint already requires a valid App Check token regardless of the console enforcement toggle.

`POST /api/enquiries` validates types, email, phone, service and length limits; rejects the honeypot; checks the exact origin and App Check; then writes to Firestore through the server SDK. It accepts at most five new enquiries per hashed IP per hour. IP values are HMAC-hashed with the server secret, not stored directly. `enquiryLimits.expiresAt` has a TTL policy in `firestore.indexes.json`; verify that it is enabled after deployment. Expiry is not used as the enforcement mechanism; the stored one-hour window is checked transactionally.

The browser supplies a random submission ID. Retrying unchanged content after a lost response reuses the ID and returns the previously saved result; changing the form creates a new ID. Direct browser creates to `enquiries` are denied. Visitors cannot read any enquiry. Admin can review entries and change status to new/reviewed/contacted. Email and WhatsApp reply buttons open their respective applications; they do not automatically send anything or update status.

**There is no email delivery service configured or implemented.** The successful form message says the enquiry was saved for review. Failures preserve input and show an error. Without App Check/server configuration, the form fails closed and directs visitors to the existing email link. Review/delete retained enquiries in Firebase according to your own retention requirements; no retention or privacy policy has been invented for the site.

## 4. Cloudinary secure uploads

1. In your Cloudinary product environment, find the cloud name, API key and API secret. Set the server-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` values.
2. Create two **signed** upload presets under Settings → Upload:

   | Preset env variable        | Allowed formats      | Maximum file size | Other settings                                       |
   | -------------------------- | -------------------- | ----------------- | ---------------------------------------------------- |
   | `CLOUDINARY_IMAGE_PRESET`  | jpg, jpeg, png, webp | 10,485,760 bytes  | Signed; no incoming transformation that changes type |
   | `CLOUDINARY_RESUME_PRESET` | pdf                  | 10,485,760 bytes  | Signed; preserve original PDF, no conversion         |

3. Set the preset names in the server environment. Do not create an unsigned preset for these flows. Turn off public unsigned uploads unless needed by another application you own.
4. The signer uses random `portfolio/image/{uuid}` or `portfolio/resume/{uuid}` public IDs, a timestamp, `overwrite=false`, the selected preset, and a fixed allowed-format list. It never accepts a folder, transformation, public ID, preset, or other arbitrary upload parameters from the client. It returns an SHA-256 signature and API key, never the API secret.
5. `/api/cloudinary/sign` checks the Firebase ID token, revocation state and the same locked `access/admin` grant before signing. The browser sends the file directly to Cloudinary, avoiding Vercel request-body size limits. The preset must enforce the 10 MB limit server-side; browser checks are an additional usability check.
6. If PDF delivery is blocked in your Cloudinary account, enable **Allow delivery of PDF and ZIP files** under the product environment's Security settings. Confirm your uploaded PDF opens from a signed-out browser.
7. In `/admin`, add/edit a project to upload its image, optional thumbnail and banner. Settings provides hero and resume uploads. A completed upload fills the URL; press Save to persist it. Upload failure does not save the record.

Uploaded images use ordinary public Cloudinary delivery URLs. Draft project records/routes are private, but a media URL already known outside the app is not an authenticated private media URL. Do not upload confidential assets. Deleting a project does not delete Cloudinary files because assets may be shared by duplicated projects. Remove unused/orphaned uploads manually in Cloudinary after checking references; cancelled edits can leave unused media.

## 5. Resume PDF and portfolio content

- Preferred: upload your actual PDF in Admin → Portal Settings → Resume PDF, then save.
- Static alternative: place the actual PDF at `public/resume.pdf`, set `VITE_RESUME_URL=/resume.pdf` before building (or save `/resume.pdf` in Settings), and redeploy. The Vercel configuration returns 404 for a missing static PDF instead of serving the SPA HTML under that filename.
- You may also save a direct HTTPS URL ending in `.pdf`. Confirm the file is actually a PDF and is publicly readable. Remote files may open in a browser PDF viewer depending on its download behavior.
- No real PDF was included in this checkout. Until one is supplied/configured, the control says Resume unavailable. It does not generate a text file or pretend a PDF was downloaded.
- The provided Cloudinary hero photo remains the default. Persisted settings override it.
- Profile identity/contact links, services, toolkit and process text remain in `src/data/initialData.ts`. Hero photo, resume URL, availability, booking window and response text are editable Firestore settings. Optional date/availability promises default to blank.
- Add reviewed projects through Admin. Slugs become document IDs and `/projects/{slug}` URLs; slugs are immutable after creation to keep links stable. Creating a duplicate generates a new slug and always starts as a private draft.
- Publication only indicates visibility on this portfolio. It does not deploy a client's site. There are no default performance scores, sample project narratives, manufactured delivery dates or fake sync indicators.
- Reorder controls atomically update display order. Public pages query `status == published`; admin preview URLs are `/admin/preview/{slug}` and require authorization. Unpublishing removes the public route's content. No draft content is placed in page HTML or bundled seed data.

## 6. Vercel deployment and local server execution

1. Import this directory/repository into Vercel. Select Vite, build command `npm run build`, output `dist`, and Node.js 22.x. The checked-in config includes the SPA fallback, API exclusions, missing-PDF 404, and admin noindex headers.
2. Add every required value from `.env.example` to the correct Vercel environment scope. `FIREBASE_ADMIN_UID` is only needed for local provisioning; authorization at runtime comes from Firestore. Never add service account/Cloudinary secrets with a `VITE_` prefix.
3. Set `NODE_OPTIONS=--experimental-require-module` for the server runtime. This prevents CommonJS/ESM loading failures in Firebase Admin's transitive authentication dependencies under runtimes that disable require(ESM). The local server tests explicitly enable it.
4. Set production/preview origins and Firebase Auth/App Check domains consistently. Deploy only after Firestore rules and the admin grant are ready.
5. Environment changes require redeployment. Vite public variables are embedded during the build.
6. For local UI-only development run `npm run dev` (port 3000). Vite alone does **not** execute `/api/*`. For real endpoint testing, use Vercel CLI: `npx vercel link`, `npx vercel env pull .env.local` (review before overwriting local values), then `npx vercel dev --listen 3000`. Include `http://localhost:3000` in your local allowed origins. Never point emulator fixtures at a production project.

Architecture/data map:

| Path                     | Behavior                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/App.tsx`            | Route handling, auth/grant subscription, separate public/admin project subscriptions, async actions |
| `src/lib/repository.ts`  | Firestore subscriptions and project/settings/enquiry-status operations                              |
| `src/lib/firebase.ts`    | Public Firebase config, memory cache, App Check; localhost development-only emulator support        |
| `server/handlers.ts`     | Authenticated signer and verified/rate-limited enquiry persistence                                  |
| `access/admin`           | Single UID grant, server-provisioned, no client writes                                              |
| `projects/{slug}`        | Project fields, visibility, order, server created/updated timestamps                                |
| `settings/public`        | Public photo/PDF URLs and optional availability text; admin writes only                             |
| `enquiries/{uuid}`       | Contact details, message, status, server timestamp, retry-content HMAC; admin reads only            |
| `enquiryLimits/{ipHmac}` | Server-only rate counters and TTL; no client reads/writes                                           |

No Firebase Hosting deployment is required: Vercel hosts the app/functions; Firebase hosts Authentication and Firestore. Routes are client-rendered; shareable project URLs load correctly on refresh, but per-project social-card previews and server-rendered SEO are not implemented. An unavailable project shows an in-app not-found state; the SPA fallback itself still returns HTTP 200. Admin routes send `X-Robots-Tag: noindex, nofollow` and render no private content before auth.

## 7. Validation and release checks

```sh
npm run lint          # TypeScript, including frontend, server and tests
npm run build         # Vite production build
npm test              # Validation, signer, auth failures, request integrity, enquiry storage/rate limits
npm run test:rules    # Actual Firestore emulator permission tests; Java required
npm run test:browser  # Auth + Firestore emulators and headless Chrome integration tests
```

The browser suite uses installed Chrome via Playwright, localhost ports 3100/8080/9099, and the isolated `demo-portfolio` project. It seeds test-only users/documents in emulators, verifies admin publishing/editing/duplicating/reordering/deletion and cross-browser public updates, tests draft routes, checks failure messaging and responsive widths. It never uploads to Cloudinary or sends an email. If Chrome is unavailable, install Chrome or change `channel` in `playwright.config.ts` and install the corresponding Playwright browser.

Before calling the live portfolio ready, verify on the deployed domain:

1. Admin login accepts the authorized account and rejects another account; refreshing/logging out behaves correctly.
2. Create/upload a draft. Confirm a signed-out browser cannot read its document or route. Publish, reorder, edit, unpublish and delete; confirm another browser sees the correct results.
3. Submit a valid enquiry; confirm exactly one Firestore document and an honest saved message. Try invalid input, failed verification and retry after a dropped response. Confirm the admin sees the saved enquiry.
4. Upload a photo and actual PDF. Open the final media URLs while signed out; test resume delivery on mobile and desktop.
5. Confirm API requests produce JSON errors, missing `/resume.pdf` produces 404, and direct `/projects/{slug}` reloads work.
6. Inspect Vercel function logs for configuration/import failures without logging tokens, secrets or enquiry bodies. Set appropriate Firebase/Cloudinary usage alerts and review retained enquiries as the owner.

Official references used for this implementation: [Firestore query rules](https://firebase.google.com/docs/firestore/security/rules-query), [App Check custom backends](https://firebase.google.com/docs/app-check/custom-resource-backend), [App Check local debugging](https://firebase.google.com/docs/app-check/web/debug-provider), [Cloudinary signatures](https://cloudinary.com/documentation/authentication_signatures), [upload presets](https://cloudinary.com/documentation/upload_presets), [PDF delivery](https://cloudinary.com/documentation/image_delivery_options), [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js), and [Vercel request headers](https://vercel.com/docs/headers/request-headers).
