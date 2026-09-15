import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getPublicProjects } from "@/services/projectRepositoryV2";
import type { Project } from "@/data/portfolioData";

export function Work() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getPublicProjects()
      .then(setProjects)
      .catch(() => setError("Projects could not be loaded. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  const tabs = useMemo(() => {
    const categories = Array.from(new Set(projects.map((project) => project.category)));
    return [
      "All",
      ...categories,
      ...(projects.some((project) => project.status === "In Progress") ? ["In Progress"] : []),
    ];
  }, [projects]);
  const visible =
    active === "All"
      ? projects
      : active === "In Progress"
        ? projects.filter((project) => project.status === active)
        : projects.filter((project) => project.category === active);

  return (
    <section
      id="work"
      tabIndex={-1}
      aria-labelledby="work-heading"
      className="portfolio-section work-section"
    >
      <div className="portfolio-container">
        <p className="eyebrow">
          <span>01 /</span> Work and progress
        </p>
        <div className="section-heading-row">
          <div>
            <h2 id="work-heading">
              Work &amp; Progress<span className="accent-dot">.</span>
            </h2>
            <p>Explore what I’ve completed and what I’m currently building.</p>
          </div>
        </div>
        {tabs.length > 1 && (
          <div className="project-tabs" role="tablist" aria-label="Filter projects">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active === tab}
                className={active === tab ? "active" : ""}
                aria-controls="project-results"
                onClick={() => setActive(tab)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const buttons = Array.from(
                    event.currentTarget.parentElement?.querySelectorAll("button") ?? [],
                  );
                  const current = buttons.indexOf(event.currentTarget);
                  const next =
                    (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
                    buttons.length;
                  buttons[next]?.focus();
                  buttons[next]?.click();
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="project-loading" role="status">
            Loading work…
          </div>
        ) : error ? (
          <p className="project-empty" role="alert">
            {error}
          </p>
        ) : visible.length === 0 ? (
          <p className="project-empty">No published work in this category yet.</p>
        ) : (
          <div className="project-grid filtered-grid" id="project-results" role="tabpanel">
            {visible.map((project) => (
              <article key={project.id} className="project-card">
                <Link
                  to={`/projects/${project.slug}`}
                  className={`project-image project-image-link project-category-${project.category.toLowerCase()}`}
                  aria-label={`View ${project.title} project details`}
                >
                  {project.category === "Websites" && (
                    <div className="browser-frame" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                  <img
                    src={project.coverImage.url}
                    alt={project.coverImage.alt}
                    loading="lazy"
                    width={1280}
                    height={800}
                  />
                </Link>
                <div className="project-body">
                  <div className="project-meta">
                    <span>{project.category}</span>
                    <span>{project.status}</span>
                  </div>
                  <h3>
                    <Link to={`/projects/${project.slug}`}>{project.title}</Link>
                  </h3>
                  <p>{project.shortDescription}</p>
                  <ul className="project-tags" aria-label="Technologies">
                    {project.technologies.slice(0, 3).map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <Link to={`/projects/${project.slug}`} className="text-link">
                    View Project <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
