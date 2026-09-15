import { ArrowUpRight, Code2, LayoutTemplate, PenTool, Workflow } from "lucide-react";
import { services } from "@/data/portfolioData";

const icons = [LayoutTemplate, Code2, PenTool, Workflow];

export function Services() {
  return (
    <section
      id="services"
      tabIndex={-1}
      aria-labelledby="services-heading"
      className="portfolio-section services-section"
    >
      <div className="portfolio-container services-layout">
        <div className="services-intro">
          <p className="eyebrow">
            <span>02 /</span> How I can help
          </p>
          <h2 id="services-heading">
            Your idea.
            <br />
            Let’s build it<span className="accent-dot">.</span>
          </h2>
          <p>
            Development comes first, with design, automation, and ongoing support available when
            your project needs them.
          </p>
        </div>
        <div className="service-list">
          {services.map((service, index) => {
            const Icon = icons[index];
            return (
              <article className="service-row" key={service.title}>
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <ul className="service-examples" aria-label={`${service.title} examples`}>
                    {service.examples.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className="text-link service-enquiry"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("service-enquiry", { detail: service.title }),
                      )
                    }
                  >
                    Enquire About This <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </div>
                <span className="service-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
