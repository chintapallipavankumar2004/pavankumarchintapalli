import { ArrowUpRight, Expand } from "lucide-react";
import { projects } from "@/data/portfolio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function repositoryUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.split("/").filter(Boolean).length === 2
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function Projects() {
  return (
    <section
      id="projects"
      tabIndex={-1}
      aria-labelledby="work-heading"
      className="portfolio-section work-section"
    >
      <div className="portfolio-container">
        <p className="eyebrow">
          <span>01 /</span> The work
        </p>
        <div className="section-heading-row">
          <h2 id="work-heading">
            Selected Work<span className="accent-dot">.</span>
          </h2>
          <p>A look at what I’ve built.</p>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => {
            const repo = repositoryUrl(project.repo);
            return (
              <article key={project.title} className="project-card">
                <Dialog>
                  <div className={`project-image project-image-${project.imageType}`}>
                    {project.imageType === "website" && (
                      <div className="browser-frame" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </div>
                    )}
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="project-image-button"
                        aria-label={`View ${project.title} image`}
                      >
                        <img
                          src={project.image}
                          alt={project.imageAlt}
                          loading="lazy"
                          width={1280}
                          height={800}
                        />
                        <span className="image-expand" aria-hidden="true">
                          <Expand size={18} />
                        </span>
                      </button>
                    </DialogTrigger>
                  </div>
                  <div className="project-body">
                    <div className="project-meta">
                      <span>{project.type}</span>
                      <span>0{index + 1}</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.tagline}</p>
                    <ul className="project-tags" aria-label="Technologies">
                      {project.stack.slice(0, 3).map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                    <div className="project-actions">
                      {project.live ? (
                        <a
                          href={project.live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          Visit Website <ArrowUpRight size={17} aria-hidden="true" />
                          <span className="sr-only"> for {project.title} (opens in a new tab)</span>
                        </a>
                      ) : (
                        <DialogTrigger asChild>
                          <button type="button" className="text-link">
                            View Project Image <ArrowUpRight size={17} aria-hidden="true" />
                            <span className="sr-only"> for {project.title}</span>
                          </button>
                        </DialogTrigger>
                      )}
                      {repo && (
                        <a
                          href={repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link"
                        >
                          Source Code <ArrowUpRight size={17} aria-hidden="true" />
                          <span className="sr-only"> for {project.title} (opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <DialogContent className="project-dialog">
                    <DialogTitle>{project.title}</DialogTitle>
                    <DialogDescription>Project artwork · {project.type}</DialogDescription>
                    <img src={project.image} alt={project.imageAlt} width={1280} height={800} />
                  </DialogContent>
                </Dialog>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
