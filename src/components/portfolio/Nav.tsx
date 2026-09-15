import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation, profile } from "@/data/portfolioData";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const media = window.matchMedia("(min-width: 800px)");
    const onResize = () => {
      if (media.matches) setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    document.addEventListener("pointerdown", onOutside);
    media.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("pointerdown", onOutside);
      media.removeEventListener("change", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const sections = ["work", "services", "about", "contact"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -55%", threshold: [0, 0.2, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const goToSection = (href: string) => {
    setOpen(false);
    document.querySelector<HTMLElement>(href)?.focus({ preventScroll: true });
  };

  return (
    <header
      className="portfolio-header"
      ref={header}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className="portfolio-container nav-inner">
        <a href="/#top" className="wordmark" aria-label={`${profile.displayName}, home`}>
          pavan<span>.</span>
        </a>
        <nav aria-label="Main navigation" className="desktop-nav">
          {navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={activeSection === link.href.split("#")[1] ? "location" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <a href="#contact" className="portfolio-button button-primary header-cta">
            Start a Project <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <button
            ref={menuButton}
            type="button"
            className="menu-toggle icon-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className="mobile-nav"
        hidden={!open}
      >
        {navigation.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={activeSection === link.href.split("#")[1] ? "location" : undefined}
            onClick={() => goToSection(`#${link.href.split("#")[1]}`)}
          >
            {link.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ))}
      </nav>
    </header>
  );
}
