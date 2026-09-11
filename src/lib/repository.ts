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
import type { Project, Enquiry, PortfolioSettings } from '../types';

const database = () => {
  if (!db) throw new Error('Firebase is not configured.');
  return db;
};
const date = (value: any) => value?.toDate?.().toLocaleString() || '';
export const projectFromDoc = (entry: any): Project => ({
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
  if (
    !project.title.trim() ||
    !project.summary.trim() ||
    !httpsUrl(project.image) ||
    !httpsUrl(project.liveUrl || '', true)
  )
    throw new Error('Add a title, summary, HTTPS image and valid optional live URL.');
  const { id, lastUpdated, ...fields } = project;
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
  const ref = doc(database(), 'projects', id);
  await runTransaction(database(), async (tx) => {
    const existing = await tx.get(ref);
    if (creating && existing.exists())
      throw new Error('This slug is already used. Choose another.');
    if (!creating && !existing.exists())
      throw new Error('This project was deleted. Refresh the catalog.');
    tx.set(ref, {
      ...clean,
      createdAt: existing.data()?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}
export async function setProjectStatus(project: Project) {
  await updateDoc(doc(database(), 'projects', project.id), {
    status: project.status === 'published' ? 'draft' : 'published',
    updatedAt: serverTimestamp(),
  });
}
export async function removeProject(id: string) {
  await deleteDoc(doc(database(), 'projects', id));
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
