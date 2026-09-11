import React, { useState } from 'react';
import { Download, Layers, CheckCircle } from 'lucide-react';
import { useSettings } from '../lib/settings';
import { TECHNICAL_TOOLKIT } from '../data/initialData';

export const AboutSection: React.FC = () => {
  const settings = useSettings();
  return (
    <section id="about" className="py-20 max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Bio Card */}
        <div className="lg:col-span-5 space-y-6">
          <span className="px-3 py-1 rounded-md bg-[#e9edff] text-[#422cd8] text-xs font-semibold uppercase tracking-wider">
            Profile Background
          </span>

          <h2 className="text-3xl md:text-4xl font-bold text-[#141b2b] tracking-tight leading-tight">
            Turning Ideas into Practical Digital Products
          </h2>

          <p className="text-base md:text-lg text-[#474555] leading-relaxed">
            I’m a software developer and freelancer who turns ideas into practical digital products.
            I work across development, design, deployment, and ongoing improvement to help
            businesses strengthen their digital presence.
          </p>

          <p className="text-sm md:text-base text-[#474555] leading-relaxed">
            Whether building a sleek storefront website for a local establishment or engineering a
            data-driven web app for scaling teams, I focus on clean maintainable code, disciplined
            structure, and reliable communication.
          </p>

          {/* Action: Download Resume Button */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <a
              id="btn-download-resume"
              href={settings.resumeUrl || undefined}
              aria-disabled={!settings.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-white border border-[#c8c4d8] hover:border-[#777587] text-[#141b2b] text-sm font-semibold hover:bg-[#f1f3ff] transition-all duration-200 shadow-xs gap-2 active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#422cd8]" />
              <span>{settings.resumeUrl ? 'Download Resume' : 'Resume unavailable'}</span>
            </a>

            <span className="text-xs text-[#474555]">
              {settings.resumeUrl ? 'PDF format' : 'Please contact me for my resume.'}
            </span>
          </div>
        </div>

        {/* Right Capability Matrix */}
        <div className="lg:col-span-7 bg-white border border-[#c8c4d8] rounded-2xl p-6 lg:p-8 shadow-sm space-y-8">
          <h3 className="text-lg md:text-xl font-bold text-[#141b2b] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#422cd8]" />
            <span>Technical Competence & Toolkit</span>
          </h3>

          {/* Group 1: Development */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#141b2b] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#422cd8]"></span>
                <span>Development & Architecture</span>
              </span>
              <span className="text-xs font-mono text-[#474555]">Core Stack</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TECHNICAL_TOOLKIT.development.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#f9f9ff] border border-[#c8c4d8]/60 text-xs font-medium text-[#141b2b]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Group 2: Creative */}
          <div className="space-y-3 border-t border-[#c8c4d8]/30 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#141b2b] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span>Creative & Visual Design</span>
              </span>
              <span className="text-xs font-mono text-[#474555]">Visual Assets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TECHNICAL_TOOLKIT.creative.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#f9f9ff] border border-[#c8c4d8]/60 text-xs font-medium text-[#141b2b]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Group 3: Tools & Delivery */}
          <div className="space-y-3 border-t border-[#c8c4d8]/30 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#141b2b] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Tools & Delivery Ecosystem</span>
              </span>
              <span className="text-xs font-mono text-[#474555]">DevOps & Infra</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TECHNICAL_TOOLKIT.tools.map((item, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#f9f9ff] border border-[#c8c4d8]/60 text-xs font-medium text-[#141b2b]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
