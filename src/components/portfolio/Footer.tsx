import { ArrowUpRight, Download } from "lucide-react";
import { profile } from "@/data/portfolioData";

export function Footer() {
  return (
    <footer className="portfolio-footer">
      <div className="portfolio-container footer-inner">
        <p>
          © {new Date().getFullYear()} {profile.displayName}
        </p>
        <nav aria-label="Social profiles and resume">
          <a href={profile.github} target="_blank" rel="noopener noreferrer">
            GitHub <ArrowUpRight size={14} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn <ArrowUpRight size={14} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {profile.resume && (
            <a href={profile.resume} download>
              Resume <Download size={14} aria-hidden="true" />
            </a>
          )}
        </nav>
        <a href="#top" className="back-top">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
