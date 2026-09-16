import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { Project } from '../types';
import { useContent } from '../lib/content';
import {
  PROJECT_CATEGORIES,
  galleryAspectRatio,
  normalizeGalleryDisplaySettings,
  projectCover,
  projectCta,
} from '../lib/projects';

interface WorkSectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onViewLiveUrl?: (url: string) => void;
}

function WorkCover({ project }: { project: Project }) {
  const cover = projectCover(project);
  const [loadedRatio, setLoadedRatio] = useState<number | null>(null);

  useEffect(() => setLoadedRatio(null), [cover?.id, cover?.url]);
  if (!cover) return null;

  const display = normalizeGalleryDisplaySettings(cover.display);
  const fallback = PROJECT_CATEGORIES[project.category].ratio;
  const hasStoredOriginalRatio = !!(display.naturalWidth && display.naturalHeight);
  const ratio = display.ratioMode === 'original' && !hasStoredOriginalRatio && loadedRatio
    ? loadedRatio
    : galleryAspectRatio(cover, fallback);
  const maxWidth = Math.min(42, 18 * ratio);

  return (
    <div className="flex min-h-0 w-full items-start justify-center overflow-hidden rounded-xl bg-[#f1f3f5]">
      <div
        data-work-cover
        data-display-ratio={ratio}
        data-fit={display.fit}
        className="w-full max-w-full overflow-hidden rounded-xl border border-[#c8c4d8]/70 bg-[#f1f3f5]"
        style={{ aspectRatio: String(ratio), maxWidth: `${maxWidth}rem` }}
      >
        <img
          src={cover.url}
          alt={cover.alt}
          loading="lazy"
          decoding="async"
          className={`h-full w-full ${display.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
          onLoad={(event) => {
            if (display.ratioMode !== 'original' || hasStoredOriginalRatio) return;
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) setLoadedRatio(image.naturalWidth / image.naturalHeight);
          }}
        />
      </div>
    </div>
  );
}

export const WorkSection: React.FC<WorkSectionProps> = ({ projects, onSelectProject }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [canPrevious, setCanPrevious] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const carousel = useRef<HTMLDivElement>(null);
  const { categories: managedCategories } = useContent();

  const publishedProjects = useMemo(() => projects.filter((project) => project.status === 'published'), [projects]);
  const categories = useMemo(() => [
    { id: 'all', label: 'All', count: publishedProjects.length },
    ...managedCategories
      .map((category) => ({ id: category.id, label: category.name, count: publishedProjects.filter((project) => project.category === category.id || project.category === category.id.replace(/s$/, '')).length }))
      .filter((category) => category.count > 0),
  ], [managedCategories, publishedProjects]);
  const filteredProjects = useMemo(() => publishedProjects.filter((project) => activeCategory === 'all' || project.category === activeCategory || project.category === activeCategory.replace(/s$/, '')), [activeCategory, publishedProjects]);

  const updateArrows = useCallback(() => {
    const node = carousel.current;
    if (!node) return;
    setCanPrevious(node.scrollLeft > 3);
    setCanNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 3);
  }, []);

  useEffect(() => {
    const node = carousel.current;
    if (!node) return;
    node.scrollTo({ left: 0, behavior: 'auto' });
    updateArrows();
    const observer = new ResizeObserver(updateArrows);
    observer.observe(node);
    node.addEventListener('scroll', updateArrows, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', updateArrows);
    };
  }, [filteredProjects, updateArrows]);

  const move = (direction: -1 | 1) => {
    const node = carousel.current;
    if (!node) return;
    const cards = [...node.querySelectorAll<HTMLElement>('[data-work-card]')];
    if (!cards.length) return;
    const current = cards.reduce((closest, card, index) => Math.abs(card.offsetLeft - node.scrollLeft) < Math.abs(cards[closest].offsetLeft - node.scrollLeft) ? index : closest, 0);
    const target = Math.max(0, Math.min(cards.length - 1, current + direction));
    node.scrollTo({ left: cards[target].offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <section id="work" className="mx-auto max-w-[1240px] overflow-hidden px-4 py-10 sm:px-6 sm:py-14 lg:py-18">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-[#e9edff] px-3 py-1 text-xs font-semibold tracking-wide text-[#422cd8]">PORTFOLIO CATALOG</div>
          <h2 className="text-3xl font-bold tracking-tight text-[#141b2b] md:text-4xl">Selected Work</h2>
          <p className="mt-1 text-base font-normal text-[#474555] md:text-lg">Explore my projects and the work behind them.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div aria-live="polite" className="rounded-lg border border-[#c8c4d8]/40 bg-white px-4 py-2 text-sm font-medium text-[#474555] shadow-xs">
            Showing <span className="font-bold text-[#141b2b]">{filteredProjects.length}</span> Published {filteredProjects.length === 1 ? 'Project' : 'Projects'}
          </div>
          <button type="button" aria-label="Previous projects" disabled={!canPrevious} onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c8c4d8] bg-white text-[#141b2b] shadow-xs disabled:cursor-not-allowed disabled:opacity-35">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next projects" disabled={!canNext} onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c8c4d8] bg-white text-[#141b2b] shadow-xs disabled:cursor-not-allowed disabled:opacity-35">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-4">
        {categories.map((category) => {
          const active = activeCategory === category.id;
          return (
            <button key={category.id} id={`filter-tab-${category.id}`} type="button" onClick={() => setActiveCategory(category.id)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all md:text-sm ${active ? 'bg-[#5b4cf0] font-semibold text-white shadow-sm' : 'border border-[#c8c4d8] bg-white text-[#474555] hover:border-[#777587] hover:text-[#141b2b]'}`}>
              <span>{category.label}</span>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-[#e9edff] text-[#422cd8]'}`}>{category.count}</span>
            </button>
          );
        })}
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-[#c8c4d8] bg-white p-12 text-center text-[#474555]">
          <p className="text-base font-medium">No projects found in this category yet.</p>
          <button type="button" onClick={() => setActiveCategory('all')} className="mt-3 text-sm font-semibold text-[#422cd8] hover:underline">View all projects</button>
        </div>
      ) : (
        <div
          ref={carousel}
          role="region"
          aria-roledescription="carousel"
          aria-label="Published projects"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
          }}
          className="custom-scrollbar flex max-w-full snap-x snap-mandatory items-start gap-4 overflow-x-auto overscroll-x-contain pb-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5b4cf0]"
        >
          {filteredProjects.map((project) => {
            const cta = projectCta(project);
            return (
              <article key={project.id} id={`project-card-${project.id}`} data-work-card className="w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-[#c8c4d8] bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-md sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
                <WorkCover project={project} />
                <div className="flex flex-col gap-3 px-1 pb-1 pt-4">
                  <span className="self-start rounded-full bg-[#e9edff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#422cd8]">{project.categoryLabel}</span>
                  <h3 className="line-clamp-2 text-xl font-bold leading-tight text-[#141b2b]">{project.title}</h3>
                  <p className="line-clamp-3 text-sm leading-6 text-[#474555]">{project.summary}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <a id={`btn-view-details-${project.id}`} href={`/projects/${project.slug}`} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onSelectProject(project); } }} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#5b4cf0] px-3.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#422cd8]">
                      View Project Details <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                    {cta && (
                      <a id={`btn-live-link-${project.id}`} href={cta.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#c8c4d8] bg-white px-3 text-sm font-semibold text-[#141b2b] transition-colors hover:bg-[#f1f3ff]">
                        {cta.label} <ExternalLink className="h-4 w-4 text-[#474555]" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
