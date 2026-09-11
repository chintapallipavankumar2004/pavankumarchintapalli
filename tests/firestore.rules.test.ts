import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createEnquiryHandler, type Services } from '../server/handlers';
import type { Request, Response } from '../server/http';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-portfolio',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => {
  await env?.cleanup();
});
const project = (slug: string, status = 'draft') => ({
  slug,
  title: 'Test Project',
  category: 'website',
  categoryLabel: 'Websites',
  tag: 'Websites',
  summary: 'A test project.',
  technologies: ['React'],
  role: '',
  status,
  image: 'https://example.com/project.png',
  thumbnail: '',
  order: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'access/admin'), { uid: 'owner' });
    await setDoc(doc(db, 'projects/draft'), project('draft'));
    await setDoc(doc(db, 'projects/live'), project('live', 'published'));
    await setDoc(doc(db, 'enquiries/test'), {
      fullName: 'Test',
      email: 'test@example.com',
      status: 'new',
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'settings/public'), {
      headshot: 'https://example.com/photo.png',
      resumeUrl: '',
      availability: '',
      bookingsWindow: '',
      responseWindow: '',
      updatedAt: Timestamp.now(),
    });
  });
});
for (const identity of ['anonymous', 'other']) {
  test(`${identity}: only published reads; no draft, private data, unrestricted query or writes`, async () => {
    const db =
      identity === 'anonymous'
        ? env.unauthenticatedContext().firestore()
        : env.authenticatedContext(identity).firestore();
    await assertSucceeds(getDoc(doc(db, 'projects/live')));
    await assertSucceeds(
      getDocs(query(collection(db, 'projects'), where('status', '==', 'published'))),
    );
    await assertFails(getDoc(doc(db, 'projects/draft')));
    await assertFails(getDocs(collection(db, 'projects')));
    await assertFails(getDoc(doc(db, 'enquiries/test')));
    await assertFails(getDocs(collection(db, 'enquiries')));
    await assertFails(getDoc(doc(db, 'access/admin')));
    await assertFails(setDoc(doc(db, 'access/admin'), { uid: identity }));
    await assertFails(setDoc(doc(db, 'projects/new'), project('new')));
    await assertFails(
      updateDoc(doc(db, 'projects/live'), { status: 'draft', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db, 'projects/draft'), { status: 'published', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db, 'projects/live'), { order: 2, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(doc(db, 'projects/live')));
    await assertFails(
      setDoc(doc(db, 'enquiries/new'), { email: 'test@example.com', status: 'new' }),
    );
    await assertSucceeds(getDoc(doc(db, 'settings/public')));
    await assertFails(
      updateDoc(doc(db, 'settings/public'), {
        availability: 'changed',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(db, 'enquiryLimits/anything')));
  });
}
test('admin can create, publish, unpublish, duplicate, reorder and delete', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(db, 'projects')));
  await assertSucceeds(setDoc(doc(db, 'projects/new'), project('new')));
  await assertSucceeds(
    updateDoc(doc(db, 'projects/new'), { status: 'published', updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    updateDoc(doc(db, 'projects/new'), { status: 'draft', updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(setDoc(doc(db, 'projects/copy'), project('copy')));
  const batch = writeBatch(db);
  batch.update(doc(db, 'projects/new'), { order: 1, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'projects/copy'), { order: 0, updatedAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await assertSucceeds(deleteDoc(doc(db, 'projects/new')));
});
test('admin cannot change authorization or save invalid projects and URLs', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDoc(doc(db, 'access/admin')));
  await assertFails(setDoc(doc(db, 'access/admin'), { uid: 'other' }));
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), slug: 'different' }));
  await assertFails(
    setDoc(doc(db, 'projects/new'), { ...project('new'), liveUrl: 'javascript:alert(1)' }),
  );
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), status: 'invalid' }));
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), secret: 'hidden data' }));
});
test('enquiry updates only change status; settings accept real PDF paths', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(db, 'enquiries')));
  await assertSucceeds(updateDoc(doc(db, 'enquiries/test'), { status: 'reviewed' }));
  await assertFails(updateDoc(doc(db, 'enquiries/test'), { email: 'changed@example.com' }));
  await assertFails(updateDoc(doc(db, 'enquiries/test'), { status: 'invalid' }));
  await assertSucceeds(
    updateDoc(doc(db, 'settings/public'), {
      resumeUrl: '/resume.pdf',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, 'settings/public'), {
      resumeUrl: 'javascript:alert(1)',
      updatedAt: serverTimestamp(),
    }),
  );
});
test('unpublishing and revoking admin access deny subsequent reads', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(
    updateDoc(doc(db, 'projects/live'), { status: 'draft', updatedAt: serverTimestamp() }),
  );
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'projects/live')));
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), 'access/admin'), { uid: 'replacement' }),
  );
  await assertFails(getDocs(collection(db, 'projects')));
  await assertFails(
    updateDoc(doc(db, 'projects/live'), { status: 'published', updatedAt: serverTimestamp() }),
  );
});

test('real enquiry transactions persist once under concurrent retries and remain private', async () => {
  const app = initializeApp({ projectId: 'demo-portfolio' }, 'enquiry-integration-test');
  try {
    const db = getFirestore(app);
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.ENQUIRY_RATE_LIMIT_SECRET = 'emulator-test-only';
    const handler = createEnquiryHandler(() => ({ db, appCheck: { verifyToken: async () => ({}) } }) as unknown as Services);
    const id = '00000000-0000-4000-8000-000000000042';
    const send = async () => {
      let status = 0;
      const req = { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', 'x-firebase-appcheck': 'emulated' }, socket: { remoteAddress: '127.0.0.1' }, body: { id, fullName: 'Test Visitor', email: 'visitor@example.com', phone: '', service: 'website', budget: 'Not specified', description: 'Please help me build a business website.' } } as unknown as Request;
      const res = { setHeader: () => {}, set statusCode(value: number) { status = value; }, end: () => {} } as unknown as Response;
      await handler(req, res); return status;
    };
    assert.deepEqual(await Promise.all([send(), send()]), [201, 201]);
    const saved = await db.doc(`enquiries/${id}`).get();
    assert.equal(saved.data()?.fullName, 'Test Visitor');
    assert.equal(saved.data()?.status, 'new');
    assert.ok(saved.data()?.createdAt.toMillis() > 0);
    const limits = await db.collection('enquiryLimits').get();
    assert.equal(limits.size, 1); assert.equal(limits.docs[0].data().count, 1);
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'enquiries', id)));
  } finally { await deleteApp(app); }
});
