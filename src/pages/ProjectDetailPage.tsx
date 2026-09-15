import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Seo } from "@/components/Seo";
import { Footer } from "@/components/portfolio/Footer";
import { Nav } from "@/components/portfolio/Nav";
import { getProjectBySlug, getPublicProjects } from "@/services/projectRepositoryV2";
import type { Project } from "@/data/portfolioData";

export function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const [project, setProject] = useState<Project>();
  const [related, setRelated] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([getProjectBySlug(slug), getPublicProjects()])
      .then(([current, all]) => {
        setProject(current);
        setRelated(
          all
            .filter((item) => item.slug !== slug && item.category === current?.category)
            .slice(0, 3),
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading)
    return (
      <main className="route-state" role="status">
        Loading project…
      </main>
    );
  if (!project)
    return (
      <main className="route-state">
        <Seo
          title="Project not found | Pavan Kumar"
          description="The requested project could not be found."
          noindex
        />
        <h1>Project not found</h1>
        <Link className="portfolio-button button-primary" to="/#work">
          Return to work
        </Link>
      </main>
    );
  const images = [project.coverImage, ...project.galleryImages];
  return (
    <div className="portfolio-page">
      <Seo
        title={`${project.title} | Chintapalli Pavan Kumar`}
        description={project.shortDescription}
        canonicalPath={`/projects/${project.slug}`}
      />
      <Nav />
      <main id="main-content">
        <article className="project-detail">
          <div className="portfolio-container">
            <Link to="/#work" className="text-link">
              <ArrowLeft size={17} /> Back to work
            </Link>
            <header className="project-detail-header">
              <div>
                <p className="eyebrow">
                  <span>{project.category}</span> {project.status}
                </p>
                <h1>{project.title}</h1>
                <p>{project.shortDescription}</p>
              </div>
              <div className="project-detail-actions">
                {project.liveUrl && (
                  <a
                    className="portfolio-button button-primary"
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Live Website <ArrowUpRight size={17} />
                  </a>
                )}
                {project.repositoryUrl && (
                  <a
                    className="portfolio-button button-secondary"
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source Code <ArrowUpRight size={17} />
                  </a>
                )}
              </div>
            </header>
            <div className={`project-cover project-category-${project.category.toLowerCase()}`}>
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
                width={1280}
                height={800}
              />
            </div>
            {project.videoUrl && (
              <section className="project-video" aria-labelledby="video-heading">
                <h2 id="video-heading">Project video</h2>
                <video controls preload="metadata" src={project.videoUrl}>
                  Your browser does not support embedded video.
                </video>
              </section>
            )}
            <div className="project-detail-grid">
              <section>
                <h2>Overview</h2>
                <p>{project.detailedDescription || project.shortDescription}</p>
              </section>
              {project.role && (
                <section>
                  <h2>My role</h2>
                  <p>{project.role}</p>
                </section>
              )}
              {project.features.length > 0 && (
                <section>
                  <h2>Features &amp; deliverables</h2>
                  <ul>
                    {project.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </section>
              )}
              {project.technologies.length > 0 && (
                <section>
                  <h2>Technology &amp; tools</h2>
                  <ul className="project-tags">
                    {project.technologies.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              {project.outcome && (
                <section>
                  <h2>Outcome</h2>
                  <p>{project.outcome}</p>
                </section>
              )}
            </div>
            {images.length > 1 && (
              <section className="project-gallery" aria-labelledby="gallery-heading">
                <h2 id="gallery-heading">Gallery</h2>
                <div>
                  {images.map((image, index) => (
                    <Dialog key={`${image.url}-${index}`}>
                      <DialogTrigger asChild>
                        <button type="button">
                          <img src={image.url} alt={image.alt} loading="lazy" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="project-dialog">
                        <DialogTitle>
                          {project.title} image {index + 1}
                        </DialogTitle>
                        <DialogDescription>{image.alt}</DialogDescription>
                        <img src={image.url} alt={image.alt} />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </section>
            )}
            {related.length > 0 && (
              <section className="related-projects">
                <h2>Related projects</h2>
                <div>
                  {related.map((item) => (
                    <Link key={item.id} to={`/projects/${item.slug}`}>
                      {item.title}
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <aside className="similar-cta">
              <h2>Planning something similar?</h2>
              <p>Tell me what you want to build and where you are in the process.</p>
              <Link className="portfolio-button button-primary" to="/#contact">
                Discuss a Similar Project <ArrowUpRight size={17} />
              </Link>
            </aside>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
