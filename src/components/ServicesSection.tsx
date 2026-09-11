import React from 'react';
import { Laptop, Terminal, Palette, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { SERVICES } from '../data/initialData';

interface ServicesSectionProps {
  onSelectService: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'laptop':
        return Laptop;
      case 'terminal':
        return Terminal;
      case 'palette':
        return Palette;
      case 'refresh-cw':
      default:
        return RefreshCw;
    }
  };

  return (
    <section id="services" className="py-20 bg-white border-t border-[#c8c4d8]/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="px-3 py-1 rounded-md bg-[#e9edff] text-[#422cd8] text-xs font-semibold uppercase tracking-wider">
            Service Capabilities
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#141b2b] mt-3 tracking-tight">
            What I Can Build for You
          </h2>
          <p className="text-base md:text-lg text-[#474555] mt-2 leading-relaxed">
            From singular landing pages to end-to-end production systems, each project is
            architected for scalability, speed, and business impact.
          </p>
        </div>

        {/* 4 Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((service) => {
            const Icon = getIcon(service.iconName);
            return (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className="p-6 rounded-2xl bg-[#f9f9ff] border border-[#c8c4d8]/60 hover:border-[#777587] transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-sm"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#5b4cf0]/10 text-[#422cd8] flex items-center justify-center mb-5 group-hover:bg-[#5b4cf0] group-hover:text-white transition-colors duration-200">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-[#141b2b] mb-2">{service.title}</h3>

                  <p className="text-xs sm:text-[13px] text-[#474555] mb-5 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="border-t border-[#c8c4d8]/30 pt-4 space-y-2.5">
                    {service.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-[#141b2b] font-medium"
                      >
                        <Check className="w-4 h-4 text-[#422cd8] shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  id={`btn-enquire-${service.id}`}
                  type="button"
                  onClick={() => onSelectService(service.id)}
                  className="mt-6 inline-flex items-center text-xs sm:text-sm text-[#422cd8] font-semibold hover:underline gap-1.5 cursor-pointer text-left"
                >
                  <span>Enquire About This</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
