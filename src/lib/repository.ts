import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { httpsUrl, pdfUrl, slugPattern } from './validation';
import type { Project, Enquiry, PortfolioSettings, SiteContent, ServiceItem, SkillItem, ProcessItem, CategoryItem, MediaAsset, CleanupJob } from '../types';
import { defaultContent } from '../data/defaultContent';
import { normalizeProject, projectWriteFields } from './projects';
import { saveProjectThroughApi } from './adminApi';

const database = () => {
  if (!db) throw new Error('Firebase is not configured.');
  return db;
};
const date = (value: any) => value?.toDate?.().toLocaleString() || '';
export const projectFromDoc = (entry: any): Project => normalizeProject({
  ...entry.data(),
  id: entry.id,
  lastUpdated: date(entry.data().updatedAt),
});
export async function isAuthorizedAdmin() {
  if (!auth?.currentUser) return false;
  try {
    return (await getDoc(doc(database(), 'access', 'admin'))).data()?.uid === auth.currentUser.uid;
  } catch {
    return false;
  }
}
export function watchProjects(
  admin: boolean,
  next: (items: Project[]) => void,
  fail: (error: Error) => void,
) {
  const ref = collection(database(), 'projects');
  return onSnapshot(
    admin ? query(ref) : query(ref, where('status', '==', 'published')),
    (snap) => {
      next(
        snap.docs.map(projectFromDoc).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
      );
    },
    fail,
  );
}
export function watchEnquiries(next: (items: Enquiry[]) => void, fail: (error: Error) => void) {
  return onSnapshot(
    collection(database(), 'enquiries'),
    (snap) =>
      next(
        snap.docs
          .sort(
            (a, b) =>
              (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0),
          )
          .map(
            (entry) =>
              ({
                ...entry.data(),
                id: entry.id,
                createdAt: date(entry.data().createdAt),
              }) as Enquiry,
          ),
      ),
    fail,
  );
}
export function watchSettings(
  next: (settings: PortfolioSettings | null) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    doc(database(), 'settings', 'public'),
    (snap) => next(snap.exists() ? (snap.data() as PortfolioSettings) : null),
    fail,
  );
}
export async function saveProject(project: Project, creating: boolean) {
  if (!slugPattern.test(project.slug) || project.slug.length > 80 || project.id !== project.slug)
    throw new Error('Use a valid project slug.');
  const fields = projectWriteFields(project);
  await saveProjectThroughApi({ ...project, ...fields }, creating);
}
export async function setProjectStatus(project: Project) {
  const nextStatus = project.status === 'published' ? 'draft' : 'published';
  await runTransaction(database(), async (tx) => {
    tx.update(doc(database(), 'projects', project.id), { status: nextStatus, updatedAt: serverTimestamp() });
    tx.set(doc(collection(database(), 'auditLogs')), {
      action: nextStatus === 'published' ? 'project.publish' : 'project.unpublish',
      entityType: 'project', entityId: project.id, adminUid: auth?.currentUser?.uid || '',
      summary: nextStatus === 'published' ? 'Published project' : 'Unpublished project', result: 'success', createdAt: serverTimestamp(),
    });
  });
}
export async function removeProject(id: string) {
  await runTransaction(database(), async tx => {
    const ref = doc(database(), 'projects', id);
    const existing = await tx.get(ref);
    if (!existing.exists()) return;
    tx.delete(ref);
    tx.set(doc(collection(database(), 'auditLogs')), { action: 'project.delete', entityType: 'project', entityId: id, adminUid: auth?.currentUser?.uid || '', summary: 'Deleted project record; media retained', result: 'success', createdAt: serverTimestamp() });
  });
}
export async function reorderProject(items: Project[], id: string, direction: -1 | 1) {
  const index = items.findIndex((p) => p.id === id);
  const other = items[index + direction];
  if (index < 0 || !other) return;
  // Reindex atomically so ties in imported data do not prevent movement.
  if (items.length > 400) throw new Error('Catalog is too large for this reorder operation.');
  const reordered = [...items];
  [reordered[index], reordered[index + direction]] = [
    reordered[index + direction],
    reordered[index],
  ];
  await runTransaction(database(), async (tx) => {
    const snapshots = await Promise.all(
      items.map((p) => tx.get(doc(database(), 'projects', p.id))),
    );
    snapshots.forEach((snapshot, i) => {
      if (!snapshot.exists() || snapshot.data().order !== items[i].order)
        throw new Error('The catalog changed. Try again.');
    });
    reordered.forEach((p, i) =>
      tx.update(doc(database(), 'projects', p.id), { order: i, updatedAt: serverTimestamp() }),
    );
    tx.set(doc(collection(database(), 'auditLogs')), {
      action: 'project.reorder', entityType: 'project', entityId: id,
      adminUid: auth?.currentUser?.uid || '', summary: 'Reordered project catalog', result: 'success', createdAt: serverTimestamp(),
    });
  });
}
export async function saveSettings(settings: PortfolioSettings) {
  if (!httpsUrl(settings.headshot) || !pdfUrl(settings.resumeUrl))
    throw new Error('Use an HTTPS photo URL and a PDF URL (or /resume.pdf).');
  await setDoc(doc(database(), 'settings', 'public'), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}
export async function setEnquiryStatus(id: string, status: Enquiry['status']) {
  await updateDoc(doc(database(), 'enquiries', id), { status });
}

type CmsCollection = 'categories' | 'services' | 'skills' | 'process';
export function watchSiteContent(next: (value: SiteContent) => void, fail: (error: Error) => void) {
  return onSnapshot(doc(database(), 'siteContent', 'general'), (snap) => next(snap.exists() ? { ...defaultContent, ...snap.data() } as SiteContent : defaultContent), fail);
}
export function watchCmsCollection<T extends { id: string; order: number; published: boolean }>(name: CmsCollection, admin: boolean, next: (items: T[]) => void, fail: (error: Error) => void) {
  const ref = collection(database(), name);
  return onSnapshot(admin ? query(ref) : query(ref, where('published', '==', true)), snap => next(snap.docs.map(d => ({ ...d.data(), id: d.id } as T)).sort((a,b) => a.order-b.order)), fail);
}
export function watchMedia(next: (items: MediaAsset[]) => void, fail: (error: Error) => void) {
  return onSnapshot(collection(database(), 'media'), snap => next(snap.docs.map(d => ({ ...d.data(), id: d.id } as MediaAsset))), fail);
}
export async function saveSiteContent(value: SiteContent) {
  if (!value.name.trim() || !value.email.includes('@') || value.metaDescription.length > 320) throw new Error('Check the name, email, and SEO description.');
  for (const url of [value.github, value.linkedin, value.ogImage, value.canonicalUrl]) if (url && !httpsUrl(url)) throw new Error('Public URLs must use HTTPS.');
  const ref = doc(database(), 'siteContent', 'general');
  await runTransaction(database(), async tx => {
    const before = await tx.get(ref);
    const revision = before.exists() ? doc(collection(database(), 'contentRevisions')) : null;
    if (revision) tx.set(revision, { entityType: 'siteContent', entityId: 'general', snapshot: before.data(), createdAt: serverTimestamp(), createdBy: auth?.currentUser?.uid || '' });
    tx.set(ref, { ...value, updatedAt: serverTimestamp(), updatedBy: auth?.currentUser?.uid || '' }, { merge: true });
    tx.set(doc(collection(database(), 'auditLogs')), { action: 'site-content.update', entityType: 'siteContent', entityId: 'general', adminUid: auth?.currentUser?.uid || '', summary: 'Updated public website content', result: 'success', createdAt: serverTimestamp() });
  });
}
export async function saveCmsItem(name: CmsCollection, item: ServiceItem | SkillItem | ProcessItem | CategoryItem) {
  if (!item.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error('Use a lowercase unique ID.');
  await setDoc(doc(database(), name, item.id), { ...item, updatedAt: serverTimestamp(), updatedBy: auth?.currentUser?.uid || '', schemaVersion: 1 }, { merge: true });
  await setDoc(doc(collection(database(), 'auditLogs')), { action: `${name}.update`, entityType: name, entityId: item.id, adminUid: auth?.currentUser?.uid || '', summary: `Updated ${name} item`, result: 'success', createdAt: serverTimestamp() });
}
export async function removeCmsItem(name: CmsCollection, id: string) {
  if (name === 'categories') {
    const linked = await import('firebase/firestore').then(({ getDocs }) => getDocs(query(collection(database(), 'projects'), where('category', '==', id))));
    if (!linked.empty) throw new Error('Reassign projects before deleting this category.');
  }
  await deleteDoc(doc(database(), name, id));
}
export async function updateEnquiry(id: string, status: Enquiry['status'], internalNote = '') {
  await updateDoc(doc(database(), 'enquiries', id), { status, internalNote: internalNote.slice(0, 2000), updatedAt: serverTimestamp() });
}
export function watchCleanupJobs(next: (items: CleanupJob[]) => void, fail: (error: Error) => void) {
  return onSnapshot(collection(database(), 'cleanupJobs'), snap => next(snap.docs.map(d => ({ ...d.data(), id: d.id } as CleanupJob))), fail);
}
export async function removeEnquiry(id: string) {
  await runTransaction(database(), async tx => {
    const ref = doc(database(), 'enquiries', id);
    const existing = await tx.get(ref);
    if (!existing.exists()) return;
    tx.delete(ref);
    tx.set(doc(collection(database(), 'auditLogs')), {
      action: 'enquiry.delete', entityType: 'enquiry', entityId: id,
      adminUid: auth?.currentUser?.uid || '', summary: 'Permanently deleted enquiry record',
      result: 'success', createdAt: serverTimestamp(),
    });
  });
}
