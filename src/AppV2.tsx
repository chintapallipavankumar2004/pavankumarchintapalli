import { useEffect } from "react";
import { Seo } from "@/components/Seo";
import { Nav } from "@/components/portfolio/Nav";
import { Hero } from "@/components/portfolio/Hero";
import { Work } from "@/components/portfolio/Work";
import { Services } from "@/components/portfolio/Services";
import { AboutV2 } from "@/components/portfolio/AboutV2";
import { ContactV2 } from "@/components/portfolio/ContactV2";
import { Footer } from "@/components/portfolio/Footer";
import { profile } from "@/data/portfolioData";

export default function AppV2() {
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
    else window.setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 0);
    let schema = document.getElementById("person-schema");
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "person-schema";
      schema.setAttribute("type", "application/ld+json");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: profile.name,
      jobTitle: profile.role,
      url: "https://pavankumarchintapalliportfolio.vercel.app",
      email: `mailto:${profile.email}`,
      sameAs: [profile.github, profile.linkedin],
      knowsAbout: [
        "Website development",
        "Web applications",
        "Java",
        "Spring Boot",
        "React",
        "Firebase",
      ],
    });
  }, []);
  return (
    <div className="portfolio-page">
      <Seo
        title="Chintapalli Pavan Kumar | Software Developer & Freelancer"
        description="Portfolio of Chintapalli Pavan Kumar, a software developer and freelancer building websites, web applications, business solutions, designs, and automation tools."
        canonicalPath="/"
      />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Work />
        <Services />
        <AboutV2 />
        <ContactV2 />
      </main>
      <Footer />
    </div>
  );
}
