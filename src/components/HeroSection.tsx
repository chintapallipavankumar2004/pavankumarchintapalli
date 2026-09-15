import React from 'react';
import { ArrowDown, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../lib/settings';
import { useContent } from '../lib/content';

interface HeroSectionProps {
  onViewWork: () => void;
  onStartProject: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onViewWork, onStartProject }) => {
  const settings = useSettings();
  const { content } = useContent();
  return (
    <section id="hero" className="relative py-10 sm:py-12 lg:py-16 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
        {/* Left Column (55% desktop: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-6">
          {/* Availability Beacon Pill */}
          <div
            id="hero-availability-pill"
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-[#c8c4d8]/50 shadow-xs"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-[#474555] text-xs sm:text-sm font-medium">
              {settings.availability || 'Let’s build your next project'}
            </span>
            {settings.bookingsWindow && <span className="text-[#c8c4d8] text-xs">•</span>}
            <span className="text-[#422cd8] text-xs font-semibold tracking-wide">
              {settings.bookingsWindow}
            </span>
          </div>

          {/* Main Heading & Title */}
          <div className="space-y-2">
            <p className="text-[#422cd8] text-sm md:text-base uppercase tracking-wider font-bold">
              {content.name}
            </p>
            <h1 className="text-[clamp(2.25rem,4.2vw,3.25rem)] font-bold text-[#141b2b] tracking-tight leading-[1.12]">
              {content.professionalTitle}
            </h1>
          </div>

          {/* Value Proposition Subtitle */}
          <p className="text-base md:text-lg text-[#474555] max-w-xl leading-relaxed font-normal">
            {content.heroDescription}
          </p>

          {/* Dual Action CTAs */}
          {(content.sectionVisibility.work || content.sectionVisibility.contact) && <div className="pt-2 flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {content.sectionVisibility.work &&
            <button
              id="btn-hero-view-work"
              type="button"
              onClick={onViewWork}
            className="inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-[#5b4cf0] text-white text-[15px] font-semibold hover:bg-[#422cd8] transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98] gap-2 cursor-pointer"
            >
              <span>{content.primaryCtaLabel}</span>
              <ArrowDown className="w-4 h-4" />
            </button>}
            {content.sectionVisibility.contact &&
            <button
              id="btn-hero-start-project"
              type="button"
              onClick={onStartProject}
              className="inline-flex items-center justify-center min-h-11 px-5 rounded-lg bg-white border border-[#c8c4d8] hover:border-[#777587] text-[#141b2b] text-[15px] font-semibold hover:bg-[#f1f3ff] transition-all duration-200 shadow-xs active:scale-[0.98] cursor-pointer"
            >
              {content.secondaryCtaLabel}
            </button>}
          </div>}

          {/* Quick Meta Stats / Confidence Indicators */}
          <div className="pt-4 grid grid-cols-3 gap-3 sm:gap-5 border-t border-[#c8c4d8]/30 w-full max-w-lg">
            <div>
              <span className="block text-xl md:text-2xl font-bold text-[#141b2b]">Direct</span>
              <span className="text-xs sm:text-sm text-[#474555]">Clear Communication</span>
            </div>
            <div>
              <span className="block text-xl md:text-2xl font-bold text-[#141b2b]">Focused</span>
              <span className="text-xs sm:text-sm text-[#474555]">Project Planning</span>
            </div>
            <div>
              <span className="block text-xl md:text-2xl font-bold text-[#141b2b]">Full-Stack</span>
              <span className="text-xs sm:text-sm text-[#474555]">React • Java • Cloud</span>
            </div>
          </div>
        </div>

        {/* Right Column (45% desktop: 5 cols) - Portrait Frame */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            {/* Accent ambient backdrop */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-[#5b4cf0]/20 to-[#e1e8fd] rounded-2xl filter blur-xl opacity-75"></div>

            {/* Card container with micro elevation */}
            <div className="relative bg-white border border-[#c8c4d8]/60 rounded-2xl p-4 shadow-sm overflow-hidden">
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-[#f1f3ff] border border-[#c8c4d8]/30">
                {/* Headshot Image */}
                <img
                  id="hero-profile-avatar"
                  alt={`${content.name} profile portrait`}
                  src={settings.headshot}
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                />

                {/* Floating badge over portrait */}
                <div className="absolute bottom-3 left-3 right-3 p-3 bg-white/90 backdrop-blur-md rounded-lg border border-[#c8c4d8]/40 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#141b2b]">{content.shortName}</p>
                    <p className="text-xs text-[#474555]">{content.roleHeadline}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#5b4cf0]/10 flex items-center justify-center text-[#422cd8]">
                    <CheckCircle2 className="w-5 h-5 fill-[#5b4cf0]/20" />
                  </div>
                </div>
              </div>

              {/* Portrait Footnote */}
              <div className="mt-3 px-2 flex items-center justify-between text-xs text-[#474555]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5b4cf0]"></span>
                  {content.location}
                </span>
                <span className="text-xs text-[#777587] font-mono">{content.timezone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
