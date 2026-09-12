export type ViewMode = 'public' | 'project-detail' | 'admin-login' | 'admin-dashboard';

export interface Project {
  id: string;
  slug: string;
  order: number;
  title: string;
  category: 'website' | 'webapp' | 'poster' | 'logo' | 'automation' | 'app';
  categoryLabel: string;
  tag: string; // e.g. "WEBSITE • CLIENT PROJECT"
  summary: string;
  fullDescription?: string;
  technologies: string[];
  liveUrl?: string;
  role: string;
  client?: string;
  timeline?: string;
  deliverables?: string;
  status: 'published' | 'draft';
  image: string;
  thumbnail: string;
  bannerImage?: string;
  lastUpdated: string;
  challenge?: string;
  solution?: string[];
}

export interface Enquiry {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  service: string;
  budget: string;
  description: string;
  createdAt: string;
  status: 'new' | 'read' | 'contacted' | 'closed';
  internalNote?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  features: string[];
  order: number;
  published: boolean;
}

export interface SkillItem { id: string; name: string; group: string; iconName?: string; order: number; published: boolean }
export interface ProcessItem { id: string; title: string; description: string; order: number; published: boolean }
export interface CategoryItem { id: string; name: string; slug: string; description?: string; iconName?: string; order: number; published: boolean; mediaLayout: 'cover' | 'gallery' | 'logo'; accent: 'indigo' | 'emerald' | 'amber' | 'rose' }
export type MediaOwnership = 'cloudinary-managed' | 'external' | 'local-static';
export interface MediaAsset { id: string; assetId?: string; publicId?: string; resourceType: 'image' | 'raw' | 'video'; deliveryType: string; format: string; version?: number; secureUrl: string; bytes?: number; width?: number; height?: number; originalFilename?: string; folder?: string; ownership: MediaOwnership; status: 'active' | 'deleting' | 'failed'; createdAt?: string; createdBy?: string }
export interface SiteContent {
  schemaVersion: number;
  name: string; shortName: string; initials: string; professionalTitle: string; roleHeadline: string;
  heroEyebrow: string; heroDescription: string; primaryCtaLabel: string; secondaryCtaLabel: string;
  aboutHeading: string; biography: string; aboutSupporting: string;
  contactHeading: string; contactDescription: string; email: string; phone: string; whatsapp: string;
  github: string; linkedin: string; location: string; timezone: string;
  footerWordmark: string; footerDescription: string; copyrightText: string;
  sectionOrder: string[]; sectionVisibility: Record<string, boolean>;
  siteTitle: string; metaDescription: string; ogTitle: string; ogDescription: string; ogImage: string; canonicalUrl: string; indexingEnabled: boolean;
  accent: 'indigo' | 'emerald' | 'amber' | 'rose'; cardStyle: 'soft' | 'bordered';
}

export interface PortfolioSettings {
  headshot: string;
  resumeUrl: string;
  availability: string;
  bookingsWindow: string;
  responseWindow: string;
}
