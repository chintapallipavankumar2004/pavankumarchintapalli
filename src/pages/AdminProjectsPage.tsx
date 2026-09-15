import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { getAdminProjects, removeProject, saveProject } from "@/services/projectRepositoryV2";
import { projectCategories, projectStatuses, type Project } from "@/data/portfolioData";

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const load = () =>
    getAdminProjects()
      .then(setProjects)
      .catch(() => setMessage("Projects could not be loaded."));
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) &&
          (!category || p.category === category) &&
          (!status || p.status === status),
      ),
    [projects, search, category, status],
  );
  const togglePublished = async (project: Project) => {
    await saveProject({ ...project, published: !project.published });
    setMessage(project.published ? "Project unpublished." : "Project published.");
    load();
  };
  const remove = async (project: Project) => {
    if (
      !window.confirm(
        `Delete “${project.title}”? This removes the selected project and its managed images.`,
      )
    )
      return;
    await removeProject(project);
    setMessage("Project deleted.");
    load();
  };
  return (
    <>
      <Seo title="Projects | Portfolio Admin" description="Private project management." noindex />
      <div className="admin-title">
        <div>
          <p className="eyebrow">
            <span>Manage</span>
          </p>
          <h1>Projects</h1>
        </div>
        <Link className="admin-button primary" to="/admin/projects/new">
          <Plus size={17} /> New project
        </Link>
      </div>
      <div className="admin-filters">
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Project title"
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {projectCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {projectStatuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="admin-message" role="status">
        {message}
      </p>
      <div className="admin-project-list">
        {visible.map((project) => (
          <article key={project.id}>
            <img src={project.coverImage.url} alt="" />
            <div>
              <div className="admin-badges">
                <span>{project.category}</span>
                <span>{project.status}</span>
                <span>{project.published ? "Published" : "Draft"}</span>
              </div>
              <h2>{project.title}</h2>
              <p>Order {project.displayOrder}</p>
            </div>
            <div className="admin-row-actions">
              <Link className="admin-button secondary" to={`/admin/projects/${project.id}/edit`}>
                <Edit3 size={16} /> Edit
              </Link>
              <button
                className="admin-button secondary"
                type="button"
                onClick={() => togglePublished(project)}
              >
                {project.published ? "Unpublish" : "Publish"}
              </button>
              <button className="admin-button danger" type="button" onClick={() => remove(project)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </article>
        ))}
        {visible.length === 0 && <p className="admin-empty">No projects match these filters.</p>}
      </div>
    </>
  );
}
