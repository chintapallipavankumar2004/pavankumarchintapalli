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
  isFeatured?: boolean;
  screenSizesCount?: number;
  lastUpdated: string;
  challenge?: string;
  solution?: string[];
  lighthouseScore?: number;
  fcpScore?: string;
  wcagScore?: number;
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
  status: 'new' | 'reviewed' | 'contacted';
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  features: string[];
}

export interface PortfolioSettings {
  headshot: string;
  resumeUrl: string;
  availability: string;
  bookingsWindow: string;
  responseWindow: string;
}
