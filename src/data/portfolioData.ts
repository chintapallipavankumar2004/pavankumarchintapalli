import portrait from "@/assets/portfolio-optimized.jpg";
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

export const projectCategories = ["Websites", "Posters", "Logos", "Automations", "Apps"] as const;
export const projectStatuses = ["Completed", "In Progress", "Concept"] as const;
export type ProjectCategory = (typeof projectCategories)[number];
export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectImage = { url: string; alt: string; storagePath?: string };

export type Project = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  detailedDescription?: string;
  category: ProjectCategory;
  projectType: string;
  status: ProjectStatus;
  clientName?: string;
  coverImage: ProjectImage;
  galleryImages: ProjectImage[];
  videoUrl?: string;
  technologies: string[];
  role?: string;
  features: string[];
  outcome?: string;
  liveUrl?: string;
  repositoryUrl?: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const seedProjects: Project[] = [
  {
    id: "coffee-hub-inkollu",
    title: "Coffee Hub Inkollu",
    slug: "coffee-hub-inkollu",
    shortDescription: "A responsive business website created for a local coffee brand.",
    detailedDescription:
      "A customer-facing business website for Coffee Hub Inkollu, created to present the brand clearly across desktop and mobile devices.",
    category: "Websites",
    projectType: "Client Project",
    status: "Completed",
    clientName: "Coffee Hub Inkollu",
    coverImage: { url: coffee, alt: "Coffee Hub Inkollu website displayed on a laptop" },
    galleryImages: [],
    technologies: ["React", "Vercel", "Responsive UI"],
    role: "Website development and responsive implementation",
    features: [
      "Responsive page layouts",
      "Customer-facing business information",
      "Production deployment",
    ],
    liveUrl: "https://coffee-hub-inkollu.vercel.app",
    featured: true,
    published: true,
    displayOrder: 1,
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z",
  },
];

export const services = [
  {
    title: "Website Development",
    description:
      "Business websites, portfolios, landing pages, and responsive customer-facing websites.",
    examples: ["Business websites", "Landing pages", "Portfolios"],
  },
  {
    title: "Web Applications",
    description: "Custom dashboards, admin panels, e-commerce systems, and business tools.",
    examples: ["Dashboards", "Admin panels", "E-commerce"],
  },
  {
    title: "Design & Branding",
    description: "Posters, logos, marketing creatives, and visual assets.",
    examples: ["Posters", "Logos", "Marketing creatives"],
  },
  {
    title: "Automation & Support",
    description: "Workflow automation, integrations, maintenance, updates, and improvements.",
    examples: ["Automation", "Integrations", "Maintenance"],
  },
];

export const skillGroups = [
  {
    title: "Development",
    skills: [
      "React",
      "TypeScript",
      "JavaScript",
      "Java",
      "Spring Boot",
      "REST APIs",
      "MySQL",
      "Firebase",
    ],
  },
  {
    title: "Creative",
    skills: ["Website design", "Poster design", "Logo design", "Marketing creatives"],
  },
  {
    title: "Tools & Delivery",
    skills: ["Git and GitHub", "Vercel", "Cloudinary", "Firebase", "Automation tools"],
  },
];
