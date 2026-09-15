import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { profile } from "@/data/portfolioData";

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="portfolio-hero">
      <div className="portfolio-container hero-grid">
        <div className="hero-copy">
          <p className="hero-name">
            {profile.name}
            <span aria-hidden="true">.</span>
          </p>
          <p className="eyebrow hero-role">{profile.role}</p>
          <h1 id="hero-heading">
            Build a stronger
            <br />
            <span>digital presence.</span>
          </h1>
          <p className="hero-description">{profile.statement}</p>
          <div className="hero-actions">
            <a href="#work" className="portfolio-button button-primary">
              View My Work <ArrowDownRight size={18} aria-hidden="true" />
            </a>
            <a
              href="#contact"
              className="portfolio-button button-secondary"
              onClick={() =>
                window.setTimeout(
                  () => document.querySelector<HTMLInputElement>("#contact-name")?.focus(),
                  0,
                )
              }
            >
              Start a Project <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          {profile.availableForFreelance && (
            <p className="availability hero-availability">
              <span aria-hidden="true" />
              Available for freelance projects
            </p>
          )}
        </div>
        <figure className="hero-portrait">
          <div className="portrait-frame">
            <img
              src={profile.portrait}
              alt={`Portrait of ${profile.name}`}
              width={1254}
              height={1568}
              style={{ objectPosition: profile.portraitPosition }}
              fetchPriority="high"
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
