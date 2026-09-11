import React from 'react';
import { WORK_PROCESS_STEPS } from '../data/initialData';

export const ProcessSection: React.FC = () => {
  return (
    <section id="process" className="py-20 bg-[#f1f3ff] border-y border-[#c8c4d8]/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="px-3 py-1 rounded-md bg-[#dce2f7] text-[#422cd8] text-xs font-semibold uppercase tracking-wider">
            Methodology
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#141b2b] mt-2 tracking-tight">
            How We Work Together
          </h2>
          <p className="text-sm md:text-base text-[#474555] mt-1">
            A structured, low-friction pathway from preliminary conversation to live deployment.
          </p>
        </div>

        {/* Step Progression Grid with Desktop Connector Line */}
        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Background connector bar for desktop */}
          <div className="hidden md:block absolute top-10 left-12 right-12 h-0.5 bg-[#c8c4d8]/60 z-0"></div>

          {WORK_PROCESS_STEPS.map((item, idx) => {
            const isLast = idx === WORK_PROCESS_STEPS.length - 1;
            return (
              <div
                key={item.step}
                id={`process-step-${item.step}`}
                className="relative z-10 bg-white p-5 rounded-xl border border-[#c8c4d8]/60 flex flex-col items-center text-center shadow-xs hover:shadow-sm transition-shadow"
              >
                <div
                  className={`w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm mb-3 ring-4 ring-white shadow-xs ${
                    isLast ? 'bg-emerald-600' : 'bg-[#5b4cf0]'
                  }`}
                >
                  {item.step}
                </div>

                <h4 className="text-base font-bold text-[#141b2b] mb-1">{item.title}</h4>

                <p className="text-xs sm:text-[13px] text-[#474555] leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
