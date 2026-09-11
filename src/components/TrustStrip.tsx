import React from 'react';
import { Smartphone, Rocket, MessageSquare, Headphones } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const trustItems = [
    {
      id: 'trust-item-1',
      icon: Smartphone,
      title: 'Responsive Development',
      description:
        'Layouts designed for phones, tablets, and desktops.',
    },
    {
      id: 'trust-item-2',
      icon: Rocket,
      title: 'Design to Deployment',
      description:
        'End-to-end delivery from wireframes and code to live server configuration.',
    },
    {
      id: 'trust-item-3',
      icon: MessageSquare,
      title: 'Clear Communication',
      description:
        'Discuss project scope, progress, and feedback directly.',
    },
    {
      id: 'trust-item-4',
      icon: Headphones,
      title: 'Ongoing Support',
      description:
        'Discuss maintenance and updates for your project.',
    },
  ];

  return (
    <section
      id="trust-strip"
      className="border-y border-[#c8c4d8]/40 bg-white py-8"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} id={item.id} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#e9edff] flex items-center justify-center text-[#422cd8] shrink-0 border border-[#c8c4d8]/30">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#141b2b]">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#474555] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
