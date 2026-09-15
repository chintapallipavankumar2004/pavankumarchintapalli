import type {
  MediaOwnership,
  Project,
  ProjectCategory,
  ProjectCategoryFields,
  ProjectGalleryItem,
} from '../types';
import { httpsUrl } from './validation';

export interface CategoryFieldDefinition {
  key: keyof ProjectCategoryFields;
  label: string;
  kind?: 'text' | 'textarea' | 'list' | 'url' | 'select';
  options?: string[];
  max?: number;
}

export interface ProjectCategoryDefinition {
  label: string;
  ratio: number;
  guidance: string;
  fields: CategoryFieldDefinition[];
  ctaLabel?: string;
  urlKey?: keyof ProjectCategoryFields;
  containMedia: boolean;
}

const technologies: CategoryFieldDefinition = { key: 'technologies', label: 'Technologies', kind: 'list', max: 30 };
const majorFeatures: CategoryFieldDefinition = { key: 'majorFeatures', label: 'Major features', kind: 'list', max: 30 };

export const PROJECT_CATEGORIES: Record<ProjectCategory, ProjectCategoryDefinition> = {
  website: {
    label: 'Websites', ratio: 16 / 9, guidance: '16:9 - recommended 1600 x 900 px', containMedia: true,
    ctaLabel: 'Visit Website', urlKey: 'liveUrl',
    fields: [technologies, { key: 'liveUrl', label: 'Live website URL', kind: 'url' }, majorFeatures, { key: 'responsiveSupport', label: 'Responsive support' }, { key: 'hostingPlatform', label: 'Hosting / platform' }],
  },
  webapp: {
    label: 'Web Applications', ratio: 16 / 9, guidance: '16:9 - recommended 1600 x 900 px', containMedia: true,
    ctaLabel: 'Open Application', urlKey: 'liveUrl',
    fields: [technologies, { key: 'liveUrl', label: 'Live application / demo URL', kind: 'url' }, majorFeatures, { key: 'userRoles', label: 'User roles', kind: 'list' }, { key: 'backendDatabase', label: 'Backend / database' }, { key: 'authentication', label: 'Authentication' }, { key: 'hostingPlatform', label: 'Hosting / platform' }],
  },
  app: {
    label: 'Apps', ratio: 9 / 16, guidance: '9:16 for mobile screenshots or 16:9 for app showcases', containMedia: true,
    ctaLabel: 'View App', urlKey: 'liveUrl',
    fields: [technologies, { key: 'platform', label: 'Platform', kind: 'select', options: ['Android', 'iOS', 'Cross-platform'] }, { key: 'liveUrl', label: 'Store or demo URL', kind: 'url' }, majorFeatures, { key: 'appStatus', label: 'App status' }],
  },
  logo: {
    label: 'Logos', ratio: 1, guidance: '1:1 - recommended 1600 x 1600 px with 10-15% safe padding', containMedia: true,
    fields: [{ key: 'designTools', label: 'Design tools', kind: 'list' }, { key: 'brandIndustry', label: 'Brand / industry' }, { key: 'designStyle', label: 'Design style' }, { key: 'colourPalette', label: 'Colour palette' }, { key: 'brandBrief', label: 'Brand brief', kind: 'textarea' }],
  },
  poster: {
    label: 'Posters', ratio: 4 / 5, guidance: '4:5 - recommended 1600 x 2000 px', containMedia: true,
    fields: [{ key: 'designTools', label: 'Design tools', kind: 'list' }, { key: 'posterType', label: 'Poster type' }, { key: 'targetAudience', label: 'Target audience' }, { key: 'designStyle', label: 'Design style' }, { key: 'campaignName', label: 'Campaign / event name' }],
  },
  automation: {
    label: 'Automations', ratio: 16 / 9, guidance: '16:9 - recommended 1600 x 900 px', containMedia: true,
    ctaLabel: 'View Demo', urlKey: 'demoUrl',
    fields: [{ key: 'toolsPlatforms', label: 'Tools / platforms', kind: 'list' }, { key: 'integrations', label: 'Integrations', kind: 'list' }, { key: 'trigger', label: 'Trigger' }, { key: 'automatedWorkflow', label: 'Automated workflow', kind: 'textarea' }, { key: 'businessOutcome', label: 'Business outcome', kind: 'textarea' }, { key: 'demoUrl', label: 'Demo URL (optional)', kind: 'url' }],
  },
};

export const categoryFieldKeys = (category: ProjectCategory) =>
  new Set(PROJECT_CATEGORIES[category].fields.map((field) => field.key));

export function sanitizeCategoryFields(category: ProjectCategory, input: ProjectCategoryFields) {
  const allowed = categoryFieldKeys(category);
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => allowed.has(key as keyof ProjectCategoryFields) && value !== '' && (!Array.isArray(value) || value.length > 0)),
  ) as ProjectCategoryFields;
}

function ownership(url: string): MediaOwnership {
  return url.startsWith('/') ? 'local-static' : 'external';
}

export function normalizeGallery(input: Partial<Project> & Record<string, unknown>): ProjectGalleryItem[] {
  if (Array.isArray(input.gallery) && input.gallery.length) {
    return input.gallery
      .filter((item): item is ProjectGalleryItem => !!item && typeof item === 'object' && typeof (item as ProjectGalleryItem).url === 'string')
      .map((item, index) => ({
        id: String(item.id || `gallery-${index + 1}`),
        url: item.url,
        ...(item.publicId ? { publicId: item.publicId } : {}),
        ...(item.mediaId ? { mediaId: item.mediaId } : {}),
        alt: String(item.alt || input.title || 'Project image'),
        ...(item.caption ? { caption: item.caption } : {}),
        order: Number.isInteger(item.order) ? item.order : index,
        ownership: item.ownership || ownership(item.url),
      }))
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((item, order) => ({ ...item, order }));
  }
  const legacyUrl = typeof input.image === 'string' ? input.image : '';
  return legacyUrl
    ? [{ id: 'legacy-cover', url: legacyUrl, alt: String(input.title || 'Project image'), order: 0, ownership: ownership(legacyUrl) }]
    : [];
}

export function normalizeProject(entry: Partial<Project> & Record<string, unknown>): Project {
  const category = (entry.category || 'website') as ProjectCategory;
  const gallery = normalizeGallery(entry);
  const legacyFields: ProjectCategoryFields = {
    technologies: Array.isArray(entry.technologies) ? entry.technologies as string[] : [],
    liveUrl: typeof entry.liveUrl === 'string' ? entry.liveUrl : '',
  };
  const categoryFields = sanitizeCategoryFields(category, {
    ...legacyFields,
    ...((entry.categoryFields || {}) as ProjectCategoryFields),
  });
  const requestedCover = typeof entry.coverImageId === 'string' ? entry.coverImageId : '';
  return {
    ...(entry as Project),
    category,
    categoryLabel: String(entry.categoryLabel || PROJECT_CATEGORIES[category].label),
    tag: String(entry.tag || PROJECT_CATEGORIES[category].label),
    gallery,
    coverImageId: gallery.some((item) => item.id === requestedCover) ? requestedCover : gallery[0]?.id || '',
    categoryFields,
    mediaIds: gallery.flatMap((item) => item.mediaId ? [item.mediaId] : []),
    schemaVersion: 2,
  };
}

export const projectCover = (project: Project) =>
  project.gallery.find((item) => item.id === project.coverImageId) || project.gallery[0];

export const projectTechnologies = (project: Project) => {
  const value = project.categoryFields.technologies;
  return Array.isArray(value) ? value : [];
};

export function projectCta(project: Project) {
  const definition = PROJECT_CATEGORIES[project.category];
  if (!definition.ctaLabel || !definition.urlKey) return null;
  const value = project.categoryFields[definition.urlKey];
  if (typeof value !== 'string' || !httpsUrl(value)) return null;
  const hostname = new URL(value).hostname.replace(/^www\./, '');
  if (['facebook.com','instagram.com','linkedin.com','x.com','twitter.com'].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return null;
  return { label: definition.ctaLabel, url: value };
}

export function removedManagedMediaIds(previous: Project, next: Project) {
  const retained = new Set(next.mediaIds);
  return previous.gallery.flatMap((item) => item.ownership === 'cloudinary-managed' && item.mediaId && !retained.has(item.mediaId) ? [item.mediaId] : []);
}

export function significantRatioDifference(width: number, height: number, category: ProjectCategory) {
  if (!width || !height) return false;
  const ratio = width / height;
  if (category === 'app') return Math.min(Math.abs(ratio - 9 / 16) / (9 / 16), Math.abs(ratio - 16 / 9) / (16 / 9)) > 0.2;
  return Math.abs(ratio - PROJECT_CATEGORIES[category].ratio) / PROJECT_CATEGORIES[category].ratio > 0.2;
}

export function validateProject(project: Project) {
  if (!project.title.trim() || !project.summary.trim()) throw new Error('Add a project title and short summary.');
  if (project.gallery.length < 1 || project.gallery.length > 5) throw new Error('Add between 1 and 5 gallery images.');
  const ids = new Set<string>();
  project.gallery.forEach((item, index) => {
    if (!item.id || ids.has(item.id)) throw new Error('Each gallery image must be unique.');
    ids.add(item.id);
    if (!httpsUrl(item.url)) throw new Error(`Gallery image ${index + 1} must use an HTTPS URL.`);
    if (!item.alt.trim() || item.alt.trim().length > 300) throw new Error(`Add concise alt text for gallery image ${index + 1}.`);
    if ((item.caption || '').length > 500) throw new Error(`Gallery image ${index + 1} caption is too long.`);
    if (item.order !== index) throw new Error('Gallery display order is invalid.');
    if (!['cloudinary-managed', 'external', 'local-static'].includes(item.ownership)) throw new Error('Gallery asset ownership is invalid.');
    if (item.ownership === 'cloudinary-managed' && (!item.mediaId || !item.publicId)) throw new Error('Managed gallery images must include their media identifiers.');
  });
  if (!ids.has(project.coverImageId)) throw new Error('Select a gallery cover image.');
  const fields = sanitizeCategoryFields(project.category, project.categoryFields);
  if (Object.keys(fields).length !== Object.keys(project.categoryFields).filter((key) => project.categoryFields[key as keyof ProjectCategoryFields] !== '').length)
    throw new Error('Remove fields that do not belong to the selected category.');
  for (const key of ['liveUrl', 'demoUrl'] as const) {
    const value = fields[key];
    if (typeof value === 'string' && value && !httpsUrl(value)) throw new Error('External project links must use HTTPS.');
  }
}

export function projectWriteFields(project: Project) {
  if (!Array.isArray(project.gallery) || project.gallery.length < 1 || project.gallery.length > 5) throw new Error('Add between 1 and 5 gallery images.');
  const normalized = normalizeProject(project as Project & Record<string, unknown>);
  validateProject(normalized);
  const {
    id: _id,
    lastUpdated: _lastUpdated,
    image: _legacyImage,
    thumbnail: _legacyThumbnail,
    bannerImage: _legacyBanner,
    technologies: _legacyTechnologies,
    liveUrl: _legacyLiveUrl,
    ...fields
  } = normalized;
  return Object.fromEntries(Object.entries({
    ...fields,
    gallery: fields.gallery.map((item, order) => ({
      id: item.id,
      url: item.url,
      ...(item.publicId ? { publicId: item.publicId } : {}),
      ...(item.mediaId ? { mediaId: item.mediaId } : {}),
      alt: item.alt.trim(),
      order,
      ...(item.caption?.trim() ? { caption: item.caption.trim() } : {}),
      ownership: item.ownership,
    })),
    categoryFields: sanitizeCategoryFields(fields.category, fields.categoryFields),
    mediaIds: fields.gallery.flatMap((item) => item.mediaId ? [item.mediaId] : []),
    schemaVersion: 2 as const,
  }).filter(([, value]) => value !== undefined));
}
