import { firebaseConfigured, getFirebaseServices } from "@/lib/firebase";
import { seedProjects, type Project, type ProjectImage } from "@/data/portfolioData";

const cleanUrl = (value?: string) => value?.trim() || undefined;
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function normalizeProject(project: Project): Project {
  return {
    ...project,
    slug: slugify(project.slug || project.title),
    title: project.title.trim(),
    shortDescription: project.shortDescription.trim(),
    galleryImages: project.galleryImages ?? [],
    technologies: (project.technologies ?? []).map((item) => item.trim()).filter(Boolean),
    features: (project.features ?? []).map((item) => item.trim()).filter(Boolean),
    liveUrl: cleanUrl(project.liveUrl),
    repositoryUrl: cleanUrl(project.repositoryUrl),
    updatedAt: new Date().toISOString(),
  };
}
export async function getPublicProjects(): Promise<Project[]> {
  if (!firebaseConfigured) return seedProjects;
  const services = await getFirebaseServices();
  if (!services) return seedProjects;
  const { collection, getDocs, orderBy, query, where } = await import("firebase/firestore");
  const result = await getDocs(
    query(
      collection(services.db, "projects"),
      where("published", "==", true),
      orderBy("displayOrder", "asc"),
    ),
  );
  const remote = result.docs.map((item) => ({ id: item.id, ...item.data() }) as Project);
  return remote.length ? remote : seedProjects;
}
export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  if (!firebaseConfigured) return seedProjects.find((item) => item.slug === slug);
  const services = await getFirebaseServices();
  if (!services) return seedProjects.find((item) => item.slug === slug);
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const result = await getDocs(
    query(
      collection(services.db, "projects"),
      where("slug", "==", slug),
      where("published", "==", true),
    ),
  );
  const item = result.docs[0];
  return item ? ({ id: item.id, ...item.data() } as Project) : undefined;
}
export async function getAdminProjects(): Promise<Project[]> {
  const services = await getFirebaseServices();
  if (!services) return [];
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const result = await getDocs(
    query(collection(services.db, "projects"), orderBy("displayOrder", "asc")),
  );
  return result.docs.map((item) => ({ id: item.id, ...item.data() }) as Project);
}
export async function getAdminProject(id: string): Promise<Project | undefined> {
  const services = await getFirebaseServices();
  if (!services) return undefined;
  const { doc, getDoc } = await import("firebase/firestore");
  const result = await getDoc(doc(services.db, "projects", id));
  return result.exists() ? ({ id: result.id, ...result.data() } as Project) : undefined;
}
export async function saveProject(project: Project): Promise<Project> {
  const services = await getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  const { doc, setDoc } = await import("firebase/firestore");
  const value = normalizeProject(project);
  await setDoc(doc(services.db, "projects", value.id), value);
  return value;
}
export async function removeProject(project: Project) {
  const services = await getFirebaseServices();
  if (!services) throw new Error("Firebase is not configured.");
  const [{ deleteDoc, doc }, { deleteObject, ref }] = await Promise.all([
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);
  const paths = [
    project.coverImage.storagePath,
    ...project.galleryImages.map((image) => image.storagePath),
  ].filter(Boolean) as string[];
  await deleteDoc(doc(services.db, "projects", project.id));
  await Promise.all(
    paths.map((path) => deleteObject(ref(services.storage, path)).catch(() => undefined)),
  );
}
export async function uploadProjectImage(file: File, projectId: string): Promise<ProjectImage> {
  const services = await getFirebaseServices();
  if (!services) throw new Error("Firebase Storage is not configured.");
  if (!file.type.startsWith("image/")) throw new Error("Choose a supported image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
  const { getDownloadURL, ref, uploadBytes } = await import("firebase/storage");
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const storagePath = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`;
  const object = ref(services.storage, storagePath);
  await uploadBytes(object, file, { contentType: file.type });
  return { url: await getDownloadURL(object), alt: "", storagePath };
}
