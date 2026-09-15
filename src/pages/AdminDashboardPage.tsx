import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { getAdminProjects } from "@/services/projectRepositoryV2";
import type { Project } from "@/data/portfolioData";

export function AdminDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    getAdminProjects()
      .then(setProjects)
      .catch(() => setError("Dashboard data could not be loaded."));
  }, []);
  const counts = useMemo(
    () => ({
      total: projects.length,
      published: projects.filter((p) => p.published).length,
      drafts: projects.filter((p) => !p.published).length,
      progress: projects.filter((p) => p.status === "In Progress").length,
    }),
    [projects],
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.category))).map(
        (category) => [category, projects.filter((p) => p.category === category).length] as const,
      ),
    [projects],
  );
  return (
    <>
      <Seo
        title="Dashboard | Portfolio Admin"
        description="Private portfolio administration."
        noindex
      />
      <div className="admin-title">
        <div>
          <p className="eyebrow">
            <span>Overview</span>
          </p>
          <h1>Dashboard</h1>
        </div>
        <Link className="admin-button primary" to="/admin/projects/new">
          Add project
        </Link>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-stats">
        {Object.entries(counts).map(([label, value]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Projects by category</h2>
        {categories.length ? (
          <ul>
            {categories.map(([category, count]) => (
              <li key={category}>
                <span>{category}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No Firestore projects yet. Add Coffee Hub or your next project when Firebase is
            configured.
          </p>
        )}
      </section>
    </>
  );
}
