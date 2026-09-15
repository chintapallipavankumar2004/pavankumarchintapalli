import { Download } from "lucide-react";
import { profile, skillGroups } from "@/data/portfolioData";

export function AboutV2() {
  return (
    <section
      id="about"
      tabIndex={-1}
      aria-labelledby="about-heading"
      className="portfolio-section about-section"
    >
      <div className="portfolio-container">
        <p className="eyebrow">
          <span>03 /</span> About and skills
        </p>
        <div className="about-grid">
          <div className="about-copy">
            <h2 id="about-heading">
              About Me<span className="accent-dot">.</span>
            </h2>
            <p>
              I’m a software developer and freelancer who turns ideas into practical digital
              products. I work across development, design, deployment, and ongoing improvement to
              help businesses establish and strengthen their digital presence.
            </p>
            {profile.resume && (
              <a
                className="portfolio-button button-secondary resume-button"
                href={profile.resume}
                download
              >
                Download Resume <Download size={17} aria-hidden="true" />
              </a>
            )}
          </div>
          <dl className="skill-groups">
            {skillGroups.map((group) => (
              <div key={group.title}>
                <dt>{group.title}</dt>
                <dd>{group.skills.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
