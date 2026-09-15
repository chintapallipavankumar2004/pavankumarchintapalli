import { profile, progress, skillGroups } from "@/data/portfolio";

export function About() {
  return (
    <section
      id="about"
      tabIndex={-1}
      aria-labelledby="about-heading"
      className="portfolio-section about-section"
    >
      <div className="portfolio-container">
        <p className="eyebrow">
          <span>03 /</span> A little about me
        </p>
        <div className="about-grid">
          <div className="about-copy">
            <h2 id="about-heading">
              Behind the Work<span className="accent-dot">.</span>
            </h2>
            <p>
              I’m {profile.name}. I combine development and creative skills to turn ideas into
              useful digital work. My focus is on clear websites, connected applications, and
              thoughtful visuals that help businesses and personal brands present what they do.
            </p>
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
        <aside className="progress-strip" aria-labelledby="progress-heading">
          <h3 id="progress-heading">Currently Building / Learning</h3>
          <ul>
            {progress.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
