import React from 'react';
import { ArrowLeft, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import type { Project } from '../types';
interface Props {
  project: Project;
  onBackToPortfolio: () => void;
  onRequestSimilar: () => void;
}
export function ProjectDetailView({ project, onBackToPortfolio, onRequestSimilar }: Props) {
  const metadata = [
    ['Client', project.client],
    ['Role', project.role],
    ['Timeline', project.timeline],
    ['Deliverables', project.deliverables],
  ].filter(([, value]) => value);
  return (
    <section id="view-project-detail" className="min-h-screen pb-24">
      <div className="bg-white border-b border-[#c8c4d8]/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
          <button
            onClick={onBackToPortfolio}
            className="inline-flex items-center gap-2 text-sm sm:text-base text-[#422cd8] font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portfolio</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {project.status === 'published' ? 'Published' : 'Private draft preview'}
            </span>
            <button
              onClick={onRequestSimilar}
              className="h-9 px-4 rounded-lg bg-[#5b4cf0] text-white text-xs sm:text-sm font-semibold"
            >
              Start a Similar Project
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-10">
        <div className="max-w-3xl space-y-4 mb-8">
          <span className="px-3 py-1 rounded-full bg-[#e9edff] text-[#422cd8] text-xs font-semibold uppercase tracking-wide">
            {project.categoryLabel}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-[#141b2b] tracking-tight">
            {project.title}
          </h1>
          <p className="text-base md:text-xl text-[#474555] leading-relaxed whitespace-pre-line">
            {project.fullDescription || project.summary}
          </p>
        </div>
        <div className="rounded-2xl border border-[#c8c4d8] bg-white overflow-hidden shadow-sm mb-12">
          <div className="relative aspect-[21/9] w-full bg-[#111827]">
            <img
              alt={`${project.title} project showcase`}
              src={project.bannerImage || project.image}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        {metadata.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-white border border-[#c8c4d8] mb-12 shadow-xs">
            {metadata.map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-[#474555] uppercase tracking-wider block font-semibold">
                  {label}
                </span>
                <span className="text-lg font-bold text-[#141b2b] mt-1 block">{value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {project.challenge && (
              <div className="bg-white p-8 rounded-2xl border border-[#c8c4d8] space-y-4 shadow-xs">
                <h2 className="text-xl md:text-2xl font-bold">The Challenge</h2>
                <p className="text-sm md:text-base text-[#474555] leading-relaxed whitespace-pre-line">
                  {project.challenge}
                </p>
              </div>
            )}
            {!!project.solution?.length && (
              <div className="bg-white p-8 rounded-2xl border border-[#c8c4d8] space-y-4 shadow-xs">
                <h2 className="text-xl md:text-2xl font-bold">The Solution</h2>
                <ul className="space-y-3">
                  {project.solution.map((text, i) => (
                    <li key={i} className="flex gap-3 text-sm md:text-base">
                      <CheckCircle2 className="w-5 h-5 text-[#422cd8] shrink-0 mt-0.5" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!project.technologies.length && (
              <div className="bg-white p-8 rounded-2xl border border-[#c8c4d8] space-y-4">
                <h2 className="text-xl font-bold">Technologies</h2>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-md bg-[#f1f3ff] text-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#c8c4d8] space-y-4 shadow-xs">
              <h2 className="text-lg font-bold">Interested in Similar Work?</h2>
              <p className="text-sm text-[#474555]">
                Tell me about your project and we can discuss the scope.
              </p>
              <button
                onClick={onRequestSimilar}
                className="w-full h-11 rounded-lg bg-[#5b4cf0] text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                Discuss Your Project
                <ArrowRight className="w-4 h-4" />
              </button>
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#422cd8]"
                >
                  View Live Project
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
