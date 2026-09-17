export type ViewMode = 'public' | 'project-detail' | 'admin-login' | 'admin-dashboard';

export type ProjectCategory = string;
export type MediaOwnership = 'cloudinary-managed' | 'external' | 'local-static';
export type GalleryRatioMode = 'original' | 'preset' | 'custom';
export type GalleryPresetRatio = '1:1' | '4:5' | '4:3' | '3:2' | '16:9' | '9:16';
export type GalleryFit = 'contain' | 'cover';

export interface GalleryDisplaySettings {
  ratioMode: GalleryRatioMode;
  presetRatio?: GalleryPresetRatio;
  customRatioWidth?: number;
  customRatioHeight?: number;
  fit: GalleryFit;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface ProjectGalleryItem {
  id: string;
  url: string;
  publicId?: string;
  mediaId?: string;
  alt: string;
  order: number;
  caption?: string;
  ownership: MediaOwnership;
  /** Missing on legacy records; normalization defaults to original ratio and contain. */
  display?: GalleryDisplaySettings;
}

export type ProjectCategoryFields = Record<string, string | string[]>;
export type ProjectCategoryFieldType = 'text' | 'textarea' | 'url' | 'list' | 'select' | 'multiselect';
export interface ProjectCategoryFieldDefinition {
  key: string;
  label: string;
  type: ProjectCategoryFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}
export interface ProjectCategoryMediaConfig {
  defaultRatio: 'original' | GalleryPresetRatio;
  recommendedWidth?: number;
  recommendedHeight?: number;
  guidance: string;
  defaultFit: GalleryFit;
}
export interface ProjectCategoryCta {
  label: string;
  urlField: string;
}

export interface Project {
  id: string;
  slug: string;
  order: number;
  title: string;
  category: ProjectCategory;
  categoryLabel: string;
  tag: string; // e.g. "WEBSITE • CLIENT PROJECT"
  summary: string;
  fullDescription?: string;
  categoryFields: ProjectCategoryFields;
  gallery: ProjectGalleryItem[];
  coverImageId: string;
  schemaVersion: 2;
  mediaIds: string[];
  /** Legacy read compatibility. New writes use gallery/categoryFields. */
  technologies?: string[];
  liveUrl?: string;
  role: string;
  client?: string;
  timeline?: string;
  deliverables?: string;
  status: 'published' | 'draft';
  image?: string;
  thumbnail?: string;
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
export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  published: boolean;
  enabled: boolean;
  mediaConfig: ProjectCategoryMediaConfig;
  fields: ProjectCategoryFieldDefinition[];
  cta?: ProjectCategoryCta;
  schemaVersion?: 2;
  /** Legacy presentation fields retained while older category documents are normalized. */
  iconName?: string;
  mediaLayout?: 'cover' | 'gallery' | 'logo';
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose';
}
export interface MediaAsset { id: string; assetId?: string; publicId?: string; resourceType: 'image' | 'raw' | 'video'; deliveryType: string; format: string; version?: number; secureUrl: string; bytes?: number; width?: number; height?: number; originalFilename?: string; folder?: string; ownership: MediaOwnership; status: 'active' | 'deleting' | 'failed'; createdAt?: string; createdBy?: string }
export interface CleanupJob { id: string; kind: 'media-delete'; mediaId: string; publicId?: string; resourceType?: string; status: 'failed' | 'pending'; attempts: number; updatedAt?: unknown }
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
