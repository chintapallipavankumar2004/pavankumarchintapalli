import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, ImagePlus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import {
  getAdminProject,
  saveProject,
  slugify,
  uploadProjectImage,
} from "@/services/projectRepositoryV2";
import { projectCategories, projectStatuses, type Project } from "@/data/portfolioData";

const blankProject = (): Project => ({
  id: crypto.randomUUID(),
  title: "",
  slug: "",
  shortDescription: "",
  detailedDescription: "",
  category: "Websites",
  projectType: "",
  status: "Completed",
  coverImage: { url: "", alt: "" },
  galleryImages: [],
  technologies: [],
  role: "",
  features: [],
  featured: false,
  published: false,
  displayOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function AdminProjectEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>(blankProject);
  const [busy, setBusy] = useState(Boolean(id));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const isNew = !id;
  useEffect(() => {
    if (id)
      getAdminProject(id)
        .then((item) => (item ? setProject(item) : setError("Project not found.")))
        .catch(() => setError("Project could not be loaded."))
        .finally(() => setBusy(false));
  }, [id]);
  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    setProject((current) => ({ ...current, [key]: value }));
  const upload = async (event: ChangeEvent<HTMLInputElement>, target: "cover" | "gallery") => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const images = await Promise.all(files.map((file) => uploadProjectImage(file, project.id)));
      if (target === "cover")
        set("coverImage", {
          ...images[0],
          alt: project.title ? `${project.title} cover image` : "Project cover image",
        });
      else
        set("galleryImages", [
          ...project.galleryImages,
          ...images.map((image) => ({
            ...image,
            alt: project.title ? `${project.title} gallery image` : "Project gallery image",
          })),
        ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!project.coverImage.url) {
      setError("Add a cover image URL or upload a cover image.");
      return;
    }
    setBusy(true);
    try {
      await saveProject({ ...project, slug: slugify(project.slug || project.title) });
      navigate("/admin/projects", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project could not be saved.");
    } finally {
      setBusy(false);
    }
  };
  const moveImage = (index: number, direction: -1 | 1) => {
    const next = [...project.galleryImages];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    set("galleryImages", next);
  };
  const preview = useMemo(
    () => project.shortDescription || "Your short description will appear here.",
    [project.shortDescription],
  );
  if (busy && id)
    return (
      <main className="admin-state" role="status">
        Loading project…
      </main>
    );
  return (
    <>
      <Seo
        title={`${isNew ? "New" : "Edit"} project | Portfolio Admin`}
        description="Private project editor."
        noindex
      />
      <Link className="text-link" to="/admin/projects">
        <ArrowLeft size={17} /> Back to projects
      </Link>
      <div className="admin-title">
        <div>
          <p className="eyebrow">
            <span>{isNew ? "Create" : "Update"}</span>
          </p>
          <h1>{isNew ? "New project" : project.title}</h1>
        </div>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <form className="admin-editor" onSubmit={submit}>
        <div className="admin-form">
          <section className="admin-panel">
            <h2>Basics</h2>
            <div className="admin-form-grid">
              <label>
                Title
                <input
                  required
                  maxLength={120}
                  value={project.title}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (isNew) set("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label>
                Slug
                <input
                  required
                  pattern="[a-z0-9-]+"
                  value={project.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                />
              </label>
              <label>
                Category
                <select
                  value={project.category}
                  onChange={(e) => set("category", e.target.value as Project["category"])}
                >
                  {projectCategories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Project type
                <input
                  required
                  maxLength={80}
                  value={project.projectType}
                  onChange={(e) => set("projectType", e.target.value)}
                  placeholder="e.g. Client Project"
                />
              </label>
              <label>
                Status
                <select
                  value={project.status}
                  onChange={(e) => set("status", e.target.value as Project["status"])}
                >
                  {projectStatuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Display order
                <input
                  type="number"
                  min="0"
                  value={project.displayOrder}
                  onChange={(e) => set("displayOrder", Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              Short description
              <textarea
                required
                maxLength={220}
                rows={3}
                value={project.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
              />
            </label>
            <label>
              Detailed description
              <textarea
                maxLength={3000}
                rows={6}
                value={project.detailedDescription || ""}
                onChange={(e) => set("detailedDescription", e.target.value)}
              />
            </label>
          </section>
          <section className="admin-panel">
            <h2>Project details</h2>
            <label>
              My role
              <input value={project.role || ""} onChange={(e) => set("role", e.target.value)} />
            </label>
            <label>
              Technologies or tools <span>one per line</span>
              <textarea
                rows={5}
                value={project.technologies.join("\n")}
                onChange={(e) => set("technologies", e.target.value.split("\n"))}
              />
            </label>
            <label>
              Features or deliverables <span>one per line</span>
              <textarea
                rows={5}
                value={project.features.join("\n")}
                onChange={(e) => set("features", e.target.value.split("\n"))}
              />
            </label>
            <label>
              Outcome <span>optional, factual only</span>
              <textarea
                rows={3}
                value={project.outcome || ""}
                onChange={(e) => set("outcome", e.target.value)}
              />
            </label>
          </section>
          <section className="admin-panel">
            <h2>Links</h2>
            <label>
              Live URL
              <input
                type="url"
                value={project.liveUrl || ""}
                onChange={(e) => set("liveUrl", e.target.value)}
              />
            </label>
            <label>
              Repository URL
              <input
                type="url"
                value={project.repositoryUrl || ""}
                onChange={(e) => set("repositoryUrl", e.target.value)}
              />
            </label>
            <label>
              Video URL
              <input
                type="url"
                value={project.videoUrl || ""}
                onChange={(e) => set("videoUrl", e.target.value)}
              />
            </label>
          </section>
          <section className="admin-panel">
            <h2>Media</h2>
            <label>
              Cover image URL
              <input
                type="url"
                value={project.coverImage.url}
                onChange={(e) => set("coverImage", { ...project.coverImage, url: e.target.value })}
              />
            </label>
            <label>
              Cover alt text
              <input
                required
                maxLength={180}
                value={project.coverImage.alt}
                onChange={(e) => set("coverImage", { ...project.coverImage, alt: e.target.value })}
              />
            </label>
            <label className="admin-upload">
              <ImagePlus size={18} /> {uploading ? "Uploading…" : "Upload cover image"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={uploading}
                onChange={(e) => upload(e, "cover")}
              />
            </label>
            <label className="admin-upload">
              <ImagePlus size={18} /> {uploading ? "Uploading…" : "Add gallery images"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                disabled={uploading}
                onChange={(e) => upload(e, "gallery")}
              />
            </label>
            {project.galleryImages.map((image, index) => (
              <div className="gallery-editor-row" key={image.url}>
                <img src={image.url} alt="" />
                <input
                  aria-label={`Alt text for gallery image ${index + 1}`}
                  value={image.alt}
                  onChange={(e) => {
                    const next = [...project.galleryImages];
                    next[index] = { ...image, alt: e.target.value };
                    set("galleryImages", next);
                  }}
                />
                <button
                  type="button"
                  aria-label="Move image up"
                  onClick={() => moveImage(index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Move image down"
                  onClick={() => moveImage(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() =>
                    set(
                      "galleryImages",
                      project.galleryImages.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>
          <section className="admin-panel admin-publish">
            <h2>Publishing</h2>
            <label>
              <input
                type="checkbox"
                checked={project.published}
                onChange={(e) => set("published", e.target.checked)}
              />{" "}
              Published
            </label>
            <label>
              <input
                type="checkbox"
                checked={project.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />{" "}
              Featured
            </label>
            <button className="admin-button primary" type="submit" disabled={busy || uploading}>
              <Save size={17} />{" "}
              {busy ? "Saving…" : project.published ? "Save and publish" : "Save draft"}
            </button>
          </section>
        </div>
        <aside className="admin-preview">
          <p>Preview</p>
          <article className="project-card">
            {project.coverImage.url ? (
              <img src={project.coverImage.url} alt={project.coverImage.alt || ""} />
            ) : (
              <div className="preview-placeholder">Cover image</div>
            )}
            <div className="project-body">
              <div className="project-meta">
                <span>{project.category}</span>
                <span>{project.status}</span>
              </div>
              <h2>{project.title || "Project title"}</h2>
              <p>{preview}</p>
              <ul className="project-tags">
                {project.technologies
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
              </ul>
            </div>
          </article>
        </aside>
      </form>
    </>
  );
}
