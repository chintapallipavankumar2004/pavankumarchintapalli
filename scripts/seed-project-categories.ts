import { FieldValue } from 'firebase-admin/firestore';
import { adminServices } from '../server/admin';
import { DEFAULT_PROJECT_CATEGORIES } from '../src/lib/categories';

const { db } = adminServices();
let created = 0;
let upgraded = 0;
let preserved = 0;

for (const definition of Object.values(DEFAULT_PROJECT_CATEGORIES)) {
  const ref = db.doc(`categories/${definition.id}`);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      tx.create(ref, {
        ...definition,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'category-seed',
      });
      created += 1;
      return;
    }

    const existing = snapshot.data() || {};
    if (existing.schemaVersion === 2) {
      preserved += 1;
      return;
    }

    const additions: Record<string, unknown> = {
      schemaVersion: 2,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'category-seed',
    };
    for (const key of ['id', 'name', 'slug', 'description', 'order', 'published', 'enabled'] as const) {
      if (existing[key] === undefined) additions[key] = definition[key];
    }
    if (existing.mediaConfig === undefined) additions.mediaConfig = definition.mediaConfig;
    if (existing.fields === undefined) additions.fields = definition.fields;
    if (existing.cta === undefined && definition.cta) additions.cta = definition.cta;
    tx.set(ref, additions, { merge: true });
    upgraded += 1;
  });
}

console.log(`Project category seed completed: ${created} created, ${upgraded} upgraded, ${preserved} already current. Existing schema-v2 definitions were preserved.`);
