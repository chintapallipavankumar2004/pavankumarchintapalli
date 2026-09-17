import type {
  CategoryItem,
  GalleryFit,
  GalleryPresetRatio,
  ProjectCategoryFieldDefinition,
  ProjectCategoryFieldType,
} from '../types';

export const categoryIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const categoryFieldKeyPattern = /^[a-z][A-Za-z0-9]*$/;
const fieldTypes = new Set<ProjectCategoryFieldType>(['text','textarea','url','list','select','multiselect']);
const presetRatios = new Set<GalleryPresetRatio>(['1:1','4:5','4:3','3:2','16:9','9:16']);
const fits = new Set<GalleryFit>(['contain','cover']);

const field = (key: string, label: string, type: ProjectCategoryFieldType = 'text', options?: string[]): ProjectCategoryFieldDefinition => ({ key, label, type, required: false, ...(options ? { options } : {}) });
const category = (id: string, name: string, order: number, defaultRatio: CategoryItem['mediaConfig']['defaultRatio'], recommendedWidth: number, recommendedHeight: number, guidance: string, fields: ProjectCategoryFieldDefinition[], cta?: CategoryItem['cta']): CategoryItem => ({
  id, name, slug:id, description:'', order, published:true, enabled:true,
  mediaConfig:{ defaultRatio, recommendedWidth, recommendedHeight, guidance, defaultFit:'contain' },
  fields, ...(cta ? { cta } : {}), schemaVersion:2,
});

const technologies=field('technologies','Technologies','list');
const majorFeatures=field('majorFeatures','Major features','list');
const designTools=field('designTools','Design tools','list');

export const DEFAULT_PROJECT_CATEGORIES: Record<string, CategoryItem> = {
  website: category('website','Websites',0,'16:9',1600,900,'16:9 - recommended 1600 x 900 px',[technologies,field('liveUrl','Live website URL','url'),majorFeatures,field('responsiveSupport','Responsive support'),field('hostingPlatform','Hosting / platform')],{label:'Visit Website',urlField:'liveUrl'}),
  webapp: category('webapp','Web Applications',1,'16:9',1600,900,'16:9 - recommended 1600 x 900 px',[technologies,field('liveUrl','Live application / demo URL','url'),majorFeatures,field('userRoles','User roles','list'),field('backendDatabase','Backend / database'),field('authentication','Authentication'),field('hostingPlatform','Hosting / platform')],{label:'Open Application',urlField:'liveUrl'}),
  app: category('app','Apps',2,'9:16',1080,1920,'9:16 for mobile screenshots or 16:9 for app showcases',[technologies,field('platform','Platform','select',['Android','iOS','Cross-platform']),field('liveUrl','Store or demo URL','url'),majorFeatures,field('appStatus','App status')],{label:'View App',urlField:'liveUrl'}),
  logo: category('logo','Logos',3,'1:1',1600,1600,'1:1 - recommended 1600 x 1600 px with 10-15% safe padding',[designTools,field('brandIndustry','Brand / industry'),field('designStyle','Design style'),field('colourPalette','Colour palette'),field('brandBrief','Brand brief','textarea')]),
  poster: category('poster','Posters',4,'4:5',1600,2000,'4:5 - recommended 1600 x 2000 px',[designTools,field('posterType','Poster type'),field('targetAudience','Target audience'),field('designStyle','Design style'),field('campaignName','Campaign / event name')]),
  automation: category('automation','Automations',5,'16:9',1600,900,'16:9 - recommended 1600 x 900 px',[field('toolsPlatforms','Tools / platforms','list'),field('integrations','Integrations','list'),field('trigger','Trigger'),field('automatedWorkflow','Automated workflow','textarea'),field('businessOutcome','Business outcome','textarea'),field('demoUrl','Demo URL (optional)','url')],{label:'View Demo',urlField:'demoUrl'}),
};

const cleanText=(value:unknown,max:number)=>typeof value==='string'?value.trim().slice(0,max):'';
const positiveDimension=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>0&&value<=100000?value:undefined;

export function normalizeCategory(input: Partial<CategoryItem> | Record<string, unknown>, fallbackId = ''): CategoryItem {
  const id=categoryIdPattern.test(String(input.id||fallbackId))?String(input.id||fallbackId):fallbackId;
  const fallback=DEFAULT_PROJECT_CATEGORIES[id];
  const rawMedia=input.mediaConfig && typeof input.mediaConfig==='object' ? input.mediaConfig as unknown as Record<string,unknown> : {};
  const rawFields=Array.isArray(input.fields)?input.fields:undefined;
  const defaultRatio=rawMedia.defaultRatio==='original'||presetRatios.has(rawMedia.defaultRatio as GalleryPresetRatio)?rawMedia.defaultRatio as CategoryItem['mediaConfig']['defaultRatio']:fallback?.mediaConfig.defaultRatio||'original';
  const defaultFit=fits.has(rawMedia.defaultFit as GalleryFit)?rawMedia.defaultFit as GalleryFit:fallback?.mediaConfig.defaultFit||'contain';
  const fields=(rawFields||fallback?.fields||[]).flatMap((entry) => {
    if(!entry||typeof entry!=='object')return [];
    const value=entry as unknown as Record<string,unknown>;
    const key=cleanText(value.key,60);
    const label=cleanText(value.label,80);
    const type=fieldTypes.has(value.type as ProjectCategoryFieldType)?value.type as ProjectCategoryFieldType:'text';
    if(!categoryFieldKeyPattern.test(key)||!label)return [];
    const options=Array.isArray(value.options)?value.options.flatMap((option)=>{const clean=cleanText(option,80);return clean?[clean]:[]}).slice(0,20):[];
    return [{key,label,type,required:value.required===true,...(cleanText(value.placeholder,120)?{placeholder:cleanText(value.placeholder,120)}:{}),...(['select','multiselect'].includes(type)?{options}: {})}];
  }).slice(0,20);
  const rawCta=input.cta&&typeof input.cta==='object'?input.cta as unknown as Record<string,unknown>:undefined;
  const ctaLabel=cleanText(rawCta?.label,60);
  const ctaField=cleanText(rawCta?.urlField,60);
  return {
    id,
    name:cleanText(input.name,80)||fallback?.name||id.split('-').map((part)=>part[0]?.toUpperCase()+part.slice(1)).join(' '),
    slug:id,
    description:cleanText(input.description,300),
    order:Number.isInteger(input.order)&&Number(input.order)>=0?Number(input.order):fallback?.order||0,
    published:input.published===undefined?(fallback?.published??false):input.published===true,
    enabled:input.enabled===undefined?(fallback?.enabled??true):input.enabled===true,
    mediaConfig:{
      defaultRatio,
      ...(positiveDimension(rawMedia.recommendedWidth)!==undefined?{recommendedWidth:positiveDimension(rawMedia.recommendedWidth)}:fallback?.mediaConfig.recommendedWidth?{recommendedWidth:fallback.mediaConfig.recommendedWidth}:{}),
      ...(positiveDimension(rawMedia.recommendedHeight)!==undefined?{recommendedHeight:positiveDimension(rawMedia.recommendedHeight)}:fallback?.mediaConfig.recommendedHeight?{recommendedHeight:fallback.mediaConfig.recommendedHeight}:{}),
      guidance:cleanText(rawMedia.guidance,200)||fallback?.mediaConfig.guidance||'Use a clear, high-quality image.',
      defaultFit,
    },
    fields,
    ...(ctaLabel&&ctaField?{cta:{label:ctaLabel,urlField:ctaField}}:{}),
    schemaVersion:2,
  };
}

export function validateCategory(input: unknown): CategoryItem {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Category details are invalid.');
  const raw=input as Record<string,unknown>;
  const allowed=new Set(['id','name','slug','description','order','published','enabled','mediaConfig','fields','cta','schemaVersion','iconName','mediaLayout','accent']);
  if(Object.keys(raw).some((key)=>!allowed.has(key)))throw new Error('The category contains unsupported fields.');
  if(typeof raw.id!=='string'||!categoryIdPattern.test(raw.id)||raw.id.length>60||raw.slug!==raw.id)throw new Error('Use a lowercase category ID with letters, numbers, and hyphens.');
  if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.trim().length>80)throw new Error('Add a category name up to 80 characters.');
  if(typeof raw.description!=='string'||raw.description.length>300||!Number.isInteger(raw.order)||Number(raw.order)<0||Number(raw.order)>10000||typeof raw.published!=='boolean'||typeof raw.enabled!=='boolean')throw new Error('Check the category description, status, and order.');
  if(!raw.mediaConfig||typeof raw.mediaConfig!=='object'||Array.isArray(raw.mediaConfig))throw new Error('Category image settings are invalid.');
  const media=raw.mediaConfig as Record<string,unknown>;
  if(Object.keys(media).some((key)=>!['defaultRatio','recommendedWidth','recommendedHeight','guidance','defaultFit'].includes(key))||!(media.defaultRatio==='original'||presetRatios.has(media.defaultRatio as GalleryPresetRatio))||!fits.has(media.defaultFit as GalleryFit)||typeof media.guidance!=='string'||media.guidance.length>200)throw new Error('Category image settings are invalid.');
  for(const key of ['recommendedWidth','recommendedHeight'])if(media[key]!==undefined&&positiveDimension(media[key])===undefined)throw new Error('Recommended dimensions must be positive whole numbers no greater than 100,000.');
  if(!Array.isArray(raw.fields)||raw.fields.length>20)throw new Error('A category can contain up to 20 project fields.');
  const seen=new Set<string>();
  for(const entry of raw.fields){
    if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new Error('A category field is malformed.');
    const value=entry as Record<string,unknown>;
    if(Object.keys(value).some((key)=>!['key','label','type','required','placeholder','options'].includes(key))||typeof value.key!=='string'||!categoryFieldKeyPattern.test(value.key)||value.key.length>60||seen.has(value.key)||typeof value.label!=='string'||!value.label.trim()||value.label.length>80||!fieldTypes.has(value.type as ProjectCategoryFieldType)||typeof value.required!=='boolean'||(value.placeholder!==undefined&&(typeof value.placeholder!=='string'||value.placeholder.length>120)))throw new Error('Category fields need unique safe keys, labels, and valid types.');
    seen.add(value.key);
    if(['select','multiselect'].includes(String(value.type))&&(!Array.isArray(value.options)||value.options.length<1||value.options.length>20||value.options.some((option)=>typeof option!=='string'||!option.trim()||option.length>80)))throw new Error('Select fields need between 1 and 20 options.');
  }
  if(raw.cta!==undefined){const cta=raw.cta as Record<string,unknown>;if(!cta||typeof cta!=='object'||Array.isArray(cta)||Object.keys(cta).some((key)=>!['label','urlField'].includes(key))||typeof cta.label!=='string'||!cta.label.trim()||cta.label.length>60||typeof cta.urlField!=='string'||!raw.fields.some((entry)=>entry&&typeof entry==='object'&&(entry as Record<string,unknown>).key===cta.urlField&&(entry as Record<string,unknown>).type==='url'))throw new Error('CTA must reference one configured URL field.');}
  return normalizeCategory(raw as Partial<CategoryItem>&Record<string,unknown>);
}

export const fallbackCategories=()=>Object.values(DEFAULT_PROJECT_CATEGORIES).map((item)=>normalizeCategory(item));
export function categoryById(id:string,categories:CategoryItem[]=[]){return categories.find((item)=>item.id===id)||DEFAULT_PROJECT_CATEGORIES[id]||normalizeCategory({id,name:id,slug:id,description:'',order:0,published:true,enabled:true,mediaConfig:{defaultRatio:'original',guidance:'Use a clear, high-quality image.',defaultFit:'contain'},fields:[]},id);}
export function categoryAspectRatio(category:CategoryItem){
  const ratios:Record<GalleryPresetRatio,number>={'1:1':1,'4:5':4/5,'4:3':4/3,'3:2':3/2,'16:9':16/9,'9:16':9/16};
  return category.mediaConfig.defaultRatio==='original'?16/9:ratios[category.mediaConfig.defaultRatio];
}
