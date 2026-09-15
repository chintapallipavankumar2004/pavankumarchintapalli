import { FieldValue } from 'firebase-admin/firestore';
import { adminServices } from '../server/admin';

const { db } = adminServices();
const [projects, media] = await Promise.all([db.collection('projects').get(), db.collection('media').get()]);
const mediaByUrl = new Map(media.docs.map((entry) => [String(entry.data().secureUrl || ''), { id: entry.id, ...entry.data() }]));
let migrated = 0;
let skipped = 0;
let batch = db.batch();
let writes = 0;

const commit = async () => {
  if (!writes) return;
  await batch.commit();
  batch = db.batch();
  writes = 0;
};

for (const entry of projects.docs) {
  const data = entry.data();
  if (data.schemaVersion === 2 && Array.isArray(data.gallery) && data.gallery.length) { skipped++; continue; }
  const image = typeof data.image === 'string' ? data.image : '';
  if (!image) { console.warn(`Skipped ${entry.id}: no legacy image URL.`); skipped++; continue; }
  const managed = mediaByUrl.get(image) as Record<string, unknown> | undefined;
  const galleryId = `legacy-${entry.id}`;
  const galleryItem = {
    id: galleryId,
    url: image,
    ...(managed?.publicId ? { publicId: managed.publicId } : {}),
    ...(managed?.id ? { mediaId: managed.id } : {}),
    alt: String(data.title || 'Project image').slice(0, 300),
    order: 0,
    ownership: managed ? 'cloudinary-managed' : 'external',
  };
  const categoryFields: Record<string, unknown> = {};
  if (Array.isArray(data.technologies) && ['website','webapp','app'].includes(data.category)) categoryFields.technologies = data.technologies;
  if (typeof data.liveUrl === 'string' && data.liveUrl) {
    if (data.category === 'automation') categoryFields.demoUrl = data.liveUrl;
    else if (['website','webapp','app'].includes(data.category)) categoryFields.liveUrl = data.liveUrl;
  }
  const backup = db.doc(`migrationBackups/gallery-v2/projects/${entry.id}`);
  batch.set(backup, { projectId: entry.id, snapshot: data, createdAt: FieldValue.serverTimestamp(), migration: 'gallery-v2' });
  batch.update(entry.ref, {
    schemaVersion: 2,
    gallery: [galleryItem],
    coverImageId: galleryId,
    mediaIds: managed?.id ? [managed.id] : [],
    categoryFields,
    updatedAt: FieldValue.serverTimestamp(),
  });
  migrated++; writes += 2;
  if (writes >= 400) await commit();
}
await commit();
console.log(`Gallery migration complete. Migrated ${migrated}; already compatible or skipped ${skipped}. Legacy fields and media were retained.`);
