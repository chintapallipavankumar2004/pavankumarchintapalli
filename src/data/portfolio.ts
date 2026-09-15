import portrait from "@/assets/portfolio.png";
import educa from "@/assets/project-educa.jpg";
import face from "@/assets/project-face.jpg";
import coffee from "@/assets/project-coffee.jpg";

export const profile = {
  name: "Chintapalli Pavan Kumar",
  displayName: "Pavan Kumar",
  role: "Software Developer & Freelancer",
  statement:
    "I build websites, web applications, and business solutions for startups and growing businesses.",
  portrait,
  portraitPosition: "50% 38%",
  email: "chintapallipavankumar2004@gmail.com",
  phone: "",
  whatsapp: "",
  github: "https://github.com/chintapallipavankumar2004",
  linkedin: "https://www.linkedin.com/in/chintapalli-pavan-kumar",
  resume: "/resume.pdf",
  availableForFreelance: true,
};

export const navigation = [
  { href: "/#work", label: "Work" },
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export type ProjectCategory = "Websites" | "Design" | "Apps" | "Automation";
export type Project = {
  title: string;
  tagline: string;
  image: string;
  imageAlt: string;
  imageType: "artwork" | "website" | "poster" | "logo" | "app";
  stack: string[];
  category: ProjectCategory;
  type: string;
  live?: string;
  repo?: string;
  // Original claims retained for review, not displayed without evidence links.
  tag: string;
  result: string;
};

// All existing records in their original order. Images are project artwork,
// not verified product screenshots. Project curation is a separate task.
export const projects: Project[] = [
  {
    title: "EDUCA",
    tag: "Featured · Hackathon",
    tagline: "A learning platform with student support and well-being features.",
    image: educa,
    imageAlt: "EDUCA project artwork with learning and well-being illustrations",
    imageType: "artwork",
    category: "Apps",
    type: "Web application",
    stack: ["React", "Spring Boot", "MySQL"],
    result: "Won a national hackathon and validated the idea as a practical product.",
  },
  {
    title: "Face Recognition Attendance",
    tag: "Published · IEEE",
    tagline: "An automated attendance system for faster, cleaner check-ins.",
    image: face,
    imageAlt: "Face Recognition Attendance project illustration of facial mapping",
    imageType: "artwork",
    category: "Apps",
    type: "Application",
    stack: ["Python", "OpenCV", "MySQL"],
    result: "Published as an IEEE paper and demonstrated reliable attendance tracking.",
  },
  {
    title: "Coffee Hub Inkollu",
    tag: "Live Client Project",
    tagline: "A live business website for a local coffee brand.",
    image: coffee,
    imageAlt: "Coffee Hub Inkollu project artwork showing a coffee website on a laptop",
    imageType: "artwork",
    category: "Websites",
    type: "Business website",
    stack: ["React", "Vercel", "Responsive UI"],
    result: "Launched in production with a cleaner customer-facing experience.",
    live: "https://coffee-hub-inkollu.vercel.app",
  },
];

export const services = [
  {
    title: "Website Development",
    description:
      "Business websites, landing pages, and portfolios built for a clear, usable online presence.",
  },
  {
    title: "Web Applications",
    description: "Custom dashboards, business tools, and connected web applications.",
  },
  {
    title: "Design & Creative",
    description: "Posters, marketing graphics, and visual assets for your brand.",
  },
  {
    title: "Automation & Support",
    description: "Practical workflow tools, website updates, and ongoing improvements.",
  },
];

// Capabilities are supported by original portfolio content, not dependencies.
export const skillGroups = [
  { title: "Build", skills: ["React", "Java", "Spring Boot", "REST APIs", "MySQL"] },
  { title: "Create", skills: ["Website design", "Poster design", "Marketing creatives"] },
  { title: "Improve", skills: ["Automation", "Integrations", "Maintenance"] },
];

export const progress = [
  { label: "Exploring", text: "AI agents and how they can support everyday tasks." },
  { label: "Building", text: "Automation workflows that connect APIs and reduce repetitive work." },
];
