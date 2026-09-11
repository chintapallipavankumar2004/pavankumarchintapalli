import React, { useState } from 'react';
import { Project } from '../types';
import { ArrowRight, ExternalLink, Lock, RotateCw, CheckCircle2 } from 'lucide-react';

interface WorkSectionProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onViewLiveUrl?: (url: string) => void;
}

export const WorkSection: React.FC<WorkSectionProps> = ({
  projects,
  onSelectProject,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('websites');

  projects = projects.filter(project => project.status === 'published');
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'websites', label: 'Websites', count: projects.filter((p) => p.category === 'website').length },
    { id: 'posters', label: 'Posters' },
    { id: 'logos', label: 'Logos' },
    { id: 'automations', label: 'Automations' },
    { id: 'apps', label: 'Apps' },
    { id: 'webapps', label: 'Web Applications' },
  ];

  const filteredProjects = projects.filter((project) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'websites') return project.category === 'website';
    if (activeCategory === 'posters') return project.category === 'poster';
    if (activeCategory === 'logos') return project.category === 'logo';
    if (activeCategory === 'automations') return project.category === 'automation';
    if (activeCategory === 'apps') return project.category === 'app';
    if (activeCategory === 'webapps') return project.category === 'webapp';
    return true;
  });

  return (
    <section id="work" className="py-20 max-w-7xl mx-auto px-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#e9edff] text-[#422cd8] text-xs font-semibold mb-2 tracking-wide">
            PORTFOLIO CATALOG
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#141b2b] tracking-tight">
            Selected Work
          </h2>
          <p className="text-base md:text-lg text-[#474555] mt-1 font-normal">
            Explore my projects and the work behind them.
          </p>
        </div>

        {/* Total Counter */}
        <div className="text-sm text-[#474555] bg-white px-4 py-2 rounded-lg border border-[#c8c4d8]/40 shadow-xs self-start md:self-auto font-medium">
          Showing <span className="font-bold text-[#141b2b]">{filteredProjects.length}</span> Published {filteredProjects.length === 1 ? 'Release' : 'Releases'}
        </div>
      </div>

      {/* Dynamic Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar mb-8">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`filter-tab-${cat.id}`}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#5b4cf0] text-white shadow-sm font-semibold'
                  : 'bg-white border border-[#c8c4d8] text-[#474555] hover:text-[#141b2b] hover:border-[#777587]'
              }`}
            >
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#e9edff] text-[#422cd8]'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Projects List */}
      <div className="space-y-8">
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-[#c8c4d8] rounded-2xl p-12 text-center text-[#474555]">
            <p className="text-base font-medium">No projects found in this category yet.</p>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className="mt-3 text-sm text-[#422cd8] hover:underline font-semibold"
            >
              View all projects
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <article
              key={project.id}
              id={`project-card-${project.id}`}
              className="bg-white border border-[#c8c4d8] rounded-2xl p-6 lg:p-8 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Info Column */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full bg-[#e9edff] text-[#422cd8] text-xs font-semibold tracking-wide uppercase">
                        {project.tag}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded text-xs font-medium border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {project.status === 'published' ? 'Published' : 'Internal Draft'}
                      </span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold text-[#141b2b]">
                      {project.title}
                    </h3>

                    <p className="text-sm md:text-base text-[#474555] leading-relaxed">
                      {project.summary}
                    </p>
                  </div>

                  {/* Tech Stack Tags */}
                  <div>
                    <p className="text-xs text-[#474555] uppercase tracking-wider mb-2 font-semibold">
                      Technologies Utilized
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-md bg-[#f1f3ff] border border-[#c8c4d8]/60 text-[#141b2b] text-xs font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action CTAs */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      id={`btn-view-details-${project.id}`}
                      href={`/projects/${project.slug}`}
                      onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); onSelectProject(project); } }}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[#5b4cf0] text-white text-sm font-semibold hover:bg-[#422cd8] transition-all duration-150 gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <span>View Project Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    {project.liveUrl && (
                      <a
                        id={`btn-live-link-${project.id}`}
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white border border-[#c8c4d8] text-[#141b2b] hover:bg-[#f1f3ff] transition-all duration-150 text-sm font-semibold gap-1.5 cursor-pointer"
                      >
                        <span>Live Website</span>
                        <ExternalLink className="w-4 h-4 text-[#474555]" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Visual Column (Browser Mockup) */}
                <div className="lg:col-span-7">
                  <div className="rounded-xl border border-[#c8c4d8]/80 bg-[#1e2330] shadow-lg overflow-hidden">
                    {/* Browser Header Bar */}
                    <div className="bg-[#293040] px-4 py-3 flex items-center justify-between border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                      </div>
                      <div className="bg-black/40 px-4 py-1 rounded text-xs font-mono text-[#d3daef]/90 flex items-center gap-2 max-w-sm w-full justify-center">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span className="truncate">{project.liveUrl || project.title}</span>
                      </div>
                      <div className="flex items-center text-[#d3daef]">
                        <RotateCw className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Showcase Preview Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#141b2b]">
                      <img
                        id={`showcase-img-${project.id}`}
                        alt={`${project.title} website interface mockup`}
                        src={project.image}
                        className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-500"
                      />


                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};
