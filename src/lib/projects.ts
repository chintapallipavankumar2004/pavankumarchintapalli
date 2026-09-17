import type {
  CategoryItem,
  GalleryDisplaySettings,
  GalleryPresetRatio,
  MediaOwnership,
  Project,
  ProjectCategory,
  ProjectCategoryFields,
  ProjectGalleryItem,
} from '../types';
import { httpsUrl } from './validation.js';
import { categoryById, categoryIdPattern } from './categories.js';

export const GALLERY_PRESET_RATIOS: Record<GalleryPresetRatio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

const MAX_IMAGE_DIMENSION = 100_000;
const ratioModes = new Set(['original', 'preset', 'custom']);
const fits = new Set(['contain', 'cover']);
const presetRatios = new Set(Object.keys(GALLERY_PRESET_RATIOS));

const validDimension = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_IMAGE_DIMENSION;
const normalizedDimension = (value: unknown) => validDimension(value) ? Math.round((value as number) * 1000) / 1000 : undefined;

export function normalizeGalleryDisplaySettings(value: unknown): GalleryDisplaySettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ratioMode: 'original', fit: 'contain' };
  const input = value as Partial<GalleryDisplaySettings>;
  const ratioMode = ratioModes.has(String(input.ratioMode)) ? input.ratioMode as GalleryDisplaySettings['ratioMode'] : 'original';
  const naturalWidth = normalizedDimension(input.naturalWidth);
  const naturalHeight = normalizedDimension(input.naturalHeight);
  return {
    ratioMode,
    ...(ratioMode === 'preset' && presetRatios.has(String(input.presetRatio)) ? { presetRatio: input.presetRatio as GalleryPresetRatio } : {}),
    ...(ratioMode === 'custom' ? {
      ...(normalizedDimension(input.customRatioWidth) !== undefined ? { customRatioWidth: normalizedDimension(input.customRatioWidth) } : {}),
      ...(normalizedDimension(input.customRatioHeight) !== undefined ? { customRatioHeight: normalizedDimension(input.customRatioHeight) } : {}),
    } : {}),
    fit: fits.has(String(input.fit)) ? input.fit as GalleryDisplaySettings['fit'] : 'contain',
    ...(naturalWidth !== undefined && naturalHeight !== undefined ? { naturalWidth, naturalHeight } : {}),
  };
}

function validateGalleryDisplaySettings(value: unknown, imageNumber: number) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Gallery image ${imageNumber} display settings are invalid.`);
  const input = value as Record<string, unknown>;
  const allowed = new Set(['ratioMode','presetRatio','customRatioWidth','customRatioHeight','fit','naturalWidth','naturalHeight']);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error(`Gallery image ${imageNumber} display settings contain unsupported fields.`);
  if (!ratioModes.has(String(input.ratioMode)) || !fits.has(String(input.fit))) throw new Error(`Gallery image ${imageNumber} display settings are invalid.`);
  if (input.ratioMode === 'preset' && !presetRatios.has(String(input.presetRatio))) throw new Error(`Select a valid display ratio for gallery image ${imageNumber}.`);
  if (input.ratioMode === 'custom' && (!validDimension(input.customRatioWidth) || !validDimension(input.customRatioHeight))) throw new Error(`Custom ratio width and height for gallery image ${imageNumber} must be positive numbers no greater than ${MAX_IMAGE_DIMENSION.toLocaleString()}.`);
  const hasNaturalWidth = input.naturalWidth !== undefined;
  const hasNaturalHeight = input.naturalHeight !== undefined;
  if (hasNaturalWidth !== hasNaturalHeight || (hasNaturalWidth && (!validDimension(input.naturalWidth) || !validDimension(input.naturalHeight)))) throw new Error(`Natural dimensions for gallery image ${imageNumber} are invalid.`);
}

export function galleryAspectRatio(item: ProjectGalleryItem, fallback = 16 / 9) {
  const display = normalizeGalleryDisplaySettings(item.display);
  if (display.ratioMode === 'preset' && display.presetRatio) return GALLERY_PRESET_RATIOS[display.presetRatio];
  if (display.ratioMode === 'custom' && display.customRatioWidth && display.customRatioHeight) return display.customRatioWidth / display.customRatioHeight;
  if (display.naturalWidth && display.naturalHeight) return display.naturalWidth / display.naturalHeight;
  return fallback;
}

export function galleryRatioLabel(item: ProjectGalleryItem, fallback = 16 / 9) {
  const display = normalizeGalleryDisplaySettings(item.display);
  if (display.ratioMode === 'preset' && display.presetRatio) return display.presetRatio;
  if (display.ratioMode === 'custom' && display.customRatioWidth && display.customRatioHeight) return `${display.customRatioWidth} / ${display.customRatioHeight}`;
  if (display.naturalWidth && display.naturalHeight) return `${display.naturalWidth} / ${display.naturalHeight}`;
  return `${Math.round(fallback * 1000) / 1000} / 1`;
}

export function significantDisplayRatioDifference(item: ProjectGalleryItem, fallback = 16 / 9) {
  const display = normalizeGalleryDisplaySettings(item.display);
  if (display.ratioMode === 'original' || !display.naturalWidth || !display.naturalHeight) return false;
  const original = display.naturalWidth / display.naturalHeight;
  const selected = galleryAspectRatio(item, fallback);
  return Math.abs(original - selected) / selected > 0.2;
}

export function normalizeProjectCategory(value: unknown, label?: unknown, tag?: unknown): ProjectCategory {
  if (typeof value === 'string' && categoryIdPattern.test(value)) return value;
  const hint = `${typeof label === 'string' ? label : ''} ${typeof tag === 'string' ? tag : ''}`.trim().toLowerCase();
  if (/\bweb applications?\b|\bwebapps?\b/.test(hint)) return 'webapp';
  if (/\bautomations?\b/.test(hint)) return 'automation';
  if (/\bposters?\b/.test(hint)) return 'poster';
  if (/\blogos?\b/.test(hint)) return 'logo';
  if (/\bapps?\b/.test(hint)) return 'app';
  return 'website';
}

export function sanitizeCategoryFields(category: ProjectCategory | CategoryItem, input: ProjectCategoryFields) {
  const definition=typeof category==='string'?categoryById(category):category;
  const allowed = new Set(definition.fields.map((field)=>field.key));
  return Object.fromEntries(
    Object.entries(input||{}).filter(([key, value]) => allowed.has(key) && value !== '' && (!Array.isArray(value) || value.length > 0)),
  ) as ProjectCategoryFields;
}

export function canonicalCategoryFields(category: ProjectCategory | CategoryItem, input: ProjectCategoryFields) {
  const definition=typeof category==='string'?categoryById(category):category;
  const sanitized = sanitizeCategoryFields(definition, input);
  return Object.fromEntries(definition.fields.map((field) => {
    const value = sanitized[field.key];
    return [field.key, ['list','multiselect'].includes(field.type) ? (Array.isArray(value) ? value : []) : (typeof value === 'string' ? value : '')];
  })) as ProjectCategoryFields;
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
        display: normalizeGalleryDisplaySettings(item.display),
      }))
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((item, order) => ({ ...item, order }));
  }
  const legacyUrl = typeof input.image === 'string' ? input.image : '';
  return legacyUrl
    ? [{ id: 'legacy-cover', url: legacyUrl, alt: String(input.title || 'Project image'), order: 0, ownership: ownership(legacyUrl), display: normalizeGalleryDisplaySettings(undefined) }]
    : [];
}

function genericCategoryFields(input: unknown): ProjectCategoryFields {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result:ProjectCategoryFields={};
  for(const [key,value] of Object.entries(input as Record<string,unknown>)){
    if(typeof value==='string')result[key]=value;
    else if(Array.isArray(value)&&value.every((item)=>typeof item==='string'))result[key]=value as string[];
  }
  return result;
}

export function normalizeProject(entry: Partial<Project> & Record<string, unknown>, configuredCategory?: CategoryItem): Project {
  const category = normalizeProjectCategory(entry.category, entry.categoryLabel, entry.tag);
  const definition=configuredCategory||categoryById(category);
  const gallery = normalizeGallery(entry);
  const legacyFields: ProjectCategoryFields = {
    technologies: Array.isArray(entry.technologies) ? entry.technologies as string[] : [],
    liveUrl: typeof entry.liveUrl === 'string' ? entry.liveUrl : '',
  };
  const rawCategoryFields = {
    ...legacyFields,
    ...((entry.categoryFields || {}) as ProjectCategoryFields),
  };
  const categoryFields = configuredCategory || definition.fields.length ? sanitizeCategoryFields(definition, rawCategoryFields) : genericCategoryFields(rawCategoryFields);
  const requestedCover = typeof entry.coverImageId === 'string' ? entry.coverImageId : '';
  return {
    ...(entry as Project),
    category,
    categoryLabel: definition.name || String(entry.categoryLabel || category),
    tag: String(definition.name || entry.tag || entry.categoryLabel || category),
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

export function projectCta(project: Project, definition: CategoryItem = categoryById(project.category)) {
  if (!definition.cta) return null;
  const value = project.categoryFields[definition.cta.urlField];
  if (typeof value !== 'string' || !httpsUrl(value)) return null;
  const hostname = new URL(value).hostname.replace(/^www\./, '');
  if (['facebook.com','instagram.com','linkedin.com','x.com','twitter.com'].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return null;
  return { label: definition.cta.label, url: value };
}

export function removedManagedMediaIds(previous: Project, next: Project) {
  const retained = new Set(next.mediaIds);
  return previous.gallery.flatMap((item) => item.ownership === 'cloudinary-managed' && item.mediaId && !retained.has(item.mediaId) ? [item.mediaId] : []);
}

function categoryRatio(definition:CategoryItem){return definition.mediaConfig.defaultRatio==='original'?16/9:GALLERY_PRESET_RATIOS[definition.mediaConfig.defaultRatio];}

export function significantRatioDifference(width: number, height: number, category: ProjectCategory | CategoryItem) {
  if (!width || !height) return false;
  const ratio = width / height;
  const definition=typeof category==='string'?categoryById(category):category;
  const expected=categoryRatio(definition);
  if(definition.id==='app'&&definition.mediaConfig.defaultRatio==='9:16')return Math.min(Math.abs(ratio-9/16)/(9/16),Math.abs(ratio-16/9)/(16/9))>0.2;
  return Math.abs(ratio - expected) / expected > 0.2;
}

export function validateProject(project: Project, definition: CategoryItem = categoryById(project.category)) {
  const textLimits: Array<[keyof Project, number]> = [['title',120],['summary',600],['categoryLabel',80],['tag',120],['role',200],['client',200],['timeline',200],['deliverables',1000],['fullDescription',10000],['challenge',10000]];
  for (const [key,max] of textLimits) {
    const value = project[key];
    if (value !== undefined && (typeof value !== 'string' || value.length > max)) throw new Error(`${String(key)} is invalid.`);
  }
  if (!project.title.trim() || !project.summary.trim()) throw new Error('Add a project title and short summary.');
  if (!categoryIdPattern.test(project.category) || project.category !== definition.id) throw new Error('Choose a valid project category.');
  if (!Number.isInteger(project.order) || project.order < 0 || !['draft','published'].includes(project.status)) throw new Error('Project order or visibility is invalid.');
  if (project.solution !== undefined && (!Array.isArray(project.solution) || project.solution.length > 30 || project.solution.some((item) => typeof item !== 'string' || !item.trim() || item.length > 10000))) throw new Error('Solution must contain valid one-per-line text items.');
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
    if ((item.mediaId || '').length > 200 || (item.publicId || '').length > 500) throw new Error('Gallery media identifiers are too long.');
    validateGalleryDisplaySettings(item.display, index + 1);
  });
  if (!ids.has(project.coverImageId)) throw new Error('Select a gallery cover image.');
  const fields = sanitizeCategoryFields(definition, project.categoryFields);
  for (const field of definition.fields) {
    const value = fields[field.key];
    const empty=value===undefined||value===''||(Array.isArray(value)&&value.length===0);
    if(field.required&&empty)throw new Error(`${field.label} is required.`);
    if(empty)continue;
    if (['list','multiselect'].includes(field.type)) {
      if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 500)) throw new Error(`${field.label} must contain valid one-per-line items.`);
      if(field.type==='multiselect'&&value.some((item)=>!field.options?.includes(item)))throw new Error(`${field.label} contains an invalid option.`);
    } else if (typeof value !== 'string' || value.length > (field.type === 'textarea' ? 2000 : field.type === 'url' ? 2048 : 500)) {
      throw new Error(`${field.label} is invalid.`);
    }
    if(field.type==='url'&&typeof value==='string'&&!httpsUrl(value))throw new Error(`${field.label} must use HTTPS.`);
    if(field.type==='select'&&typeof value==='string'&&!field.options?.includes(value))throw new Error(`${field.label} contains an invalid option.`);
  }
}

export function projectWriteFields(project: Project, configuredCategory?: CategoryItem) {
  const definition=configuredCategory||categoryById(project.category);
  if (!Array.isArray(project.gallery) || project.gallery.length < 1 || project.gallery.length > 5) throw new Error('Add between 1 and 5 gallery images.');
  const allowedProjectKeys = new Set(['id','slug','order','title','category','categoryLabel','tag','summary','fullDescription','categoryFields','gallery','coverImageId','schemaVersion','mediaIds','technologies','liveUrl','role','client','timeline','deliverables','status','image','thumbnail','bannerImage','lastUpdated','challenge','solution','createdAt','updatedAt']);
  if (Object.keys(project).some((key) => !allowedProjectKeys.has(key))) throw new Error('The project contains unsupported fields.');
  const allowedGalleryKeys = new Set(['id','url','publicId','mediaId','alt','order','caption','ownership','display']);
  if (project.gallery.some((item) => Object.keys(item).some((key) => !allowedGalleryKeys.has(key)))) throw new Error('A gallery image contains unsupported fields.');
  project.gallery.forEach((item, index) => validateGalleryDisplaySettings(item.display, index + 1));
  const allowedCategoryKeys = new Set(definition.fields.map((field)=>field.key));
  if (Object.keys(project.categoryFields || {}).some((key) => !allowedCategoryKeys.has(key))) throw new Error('Remove fields that do not belong to the selected category.');
  const normalized = normalizeProject(project as Project & Record<string, unknown>,definition);
  validateProject(normalized,definition);
  return {
    slug: normalized.slug,
    order: normalized.order,
    title: normalized.title,
    category: normalized.category,
    categoryLabel: normalized.categoryLabel,
    tag: normalized.tag,
    summary: normalized.summary,
    fullDescription: normalized.fullDescription || '',
    role: normalized.role || '',
    client: normalized.client || '',
    timeline: normalized.timeline || '',
    deliverables: normalized.deliverables || '',
    status: normalized.status,
    challenge: normalized.challenge || '',
    solution: normalized.solution || [],
    gallery: normalized.gallery.map((item, order) => ({
      id: item.id,
      url: item.url,
      publicId: item.publicId || '',
      mediaId: item.mediaId || '',
      alt: item.alt.trim(),
      order,
      caption: item.caption?.trim() || '',
      ownership: item.ownership,
      display: normalizeGalleryDisplaySettings(item.display),
    })),
    categoryFields: canonicalCategoryFields(definition, normalized.categoryFields),
    mediaIds: normalized.gallery.flatMap((item) => item.mediaId ? [item.mediaId] : []),
    schemaVersion: 2 as const,
    coverImageId: normalized.coverImageId,
  };
}
