# Local validation — 2026-09-11

## Passed

- `npm run lint`: strict TypeScript validation, including React types, frontend, server endpoints and tests.
- `npm run build`: production Vite build. The final build required execution outside the local sandbox because esbuild could not resolve the workspace configuration through a restricted parent directory.
- `npm test`: 11 tests covering enquiry validation, safe routes/URLs, upload-signature parameters, missing/invalid/non-admin authentication, revoked-token checking, origin restrictions, enquiry idempotency/rate limits, failure handling and the scoped UUID dependency compatibility fix.
- `npm run test:rules`: 7 emulator test groups covering published-only reads, forbidden draft/enquiry reads, unauthorized writes, admin create/update/publish/unpublish/duplicate/reorder/delete, grant protection/revocation, settings constraints and actual Firestore enquiry transactions under concurrent retries. The concurrent submissions created one enquiry and incremented the rate counter once.
- `npm run test:browser`: 3 headless Chrome integration tests against local Firebase Auth/Firestore emulators. Covered direct project links, refresh/back navigation, private draft routes, responsive widths 390/768/1440, service prefilling, honest enquiry configuration failure, absent-PDF state, admin login/CRUD/duplicate/reorder/publication, cross-browser changes, settings persistence and logout.
- `npm audit --omit=dev --json`: zero production dependency advisories after the targeted `gaxios@6.7.1 -> uuid@^11.1.1` override. The multipart code path using UUID v4 is covered by a compatibility regression test.

## Limits and remaining setup

- No Firebase/Cloudinary/Vercel production credentials were provided. No cloud project, IAM permissions, admin grant, App Check registration, rules/index deployment, Cloudinary presets or Vercel deployment were created or verified against real services.
- A real resume PDF was not present or supplied. PDF links/uploads are implemented; the resume control remains unavailable until an actual PDF is configured.
- No email service exists; success means a confirmed Firestore save, never email delivery.
- Browser tests block external HTTPS assets to avoid relying on CDN availability. They check the configured hero URL and layout but do not verify live Cloudinary delivery. Existing fonts are now bundled locally. Real image/PDF uploads and signed-out PDF delivery need a configured deployment smoke test.
- App Check verification and Firebase token failure paths use controlled service doubles in endpoint tests. Firestore writes/rules and browser Authentication run against actual local emulators. Real App Check attestation, Firebase token revocation and Cloudinary signature acceptance require the release checks in SETUP.md.
- The build reports a JavaScript chunk over 500 kB, largely from the Firebase client SDK. Admin screens are lazy-loaded; additional Firebase splitting is a possible performance follow-up.
- Seven moderate advisories remain in development tooling dependencies from Firebase CLI; no high/critical advisories were reported. Compatible `npm audit fix` did not resolve them; forcing npm's proposed old Firebase CLI downgrade was avoided. Review upstream fixes before upgrading tooling.
- Project URLs are client-rendered. Per-project crawler/social-card rendering and HTTP 404 responses for unknown project slugs are not server-rendered features of this implementation.

Follow [SETUP.md](SETUP.md) for the complete environment, Firebase, App Check, Cloudinary and Vercel steps and live verification checklist. Local validation is not a claim that the site is deployed or configured in production.

## CMS expansion — 2026-09-12

- Added typed Firestore content for site text/SEO, categories, services, skills and process steps; a private media registry, audit records, revisions and cleanup jobs; and an idempotent `npm run cms:seed` migration.
- Added protected media-completion and media-deletion endpoints. Both require a valid Firebase ID token, App Check token, allowed origin and admin grant/claim. Managed deletion uses stored public IDs and CDN invalidation; failures create cleanup work.
- `npm run lint`, `npm test`, `npm run test:rules`, `npm run build` and the final `npm run test:browser` pass. The browser suite ran three flows covering public draft exclusion/routes/responsive widths, service selection and honest App Check failure, plus authenticated admin project operations and cross-browser publication.
- Cloudinary upload/completion/deletion, App Check attestation, migration, rules deployment and responsive production behavior still require verification against the configured Firebase, Cloudinary and Vercel environments. No deployment was performed.
