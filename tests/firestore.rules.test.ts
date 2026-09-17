import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createCategoryManageHandler, createEnquiryHandler, createProjectReorderHandler, createProjectSaveHandler, type Services } from '../server/handlers';
import { DEFAULT_PROJECT_CATEGORIES } from '../src/lib/categories';
import type { Request, Response } from '../server/http';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-portfolio',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => {
  await env?.cleanup();
});
const project = (slug: string, status = 'draft') => ({
  slug,
  title: 'Test Project',
  category: 'website',
  categoryLabel: 'Websites',
  tag: 'Websites',
  summary: 'A test project.',
  technologies: ['React'],
  role: '',
  status,
  image: 'https://example.com/project.png',
  thumbnail: '',
  order: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const projectV2 = (slug: string, category = 'website') => ({
  slug, title:'Gallery Project', category, categoryLabel:'Websites', tag:'Websites', summary:'A gallery project.', role:'', status:'draft', order:0,
  fullDescription:'', client:'', timeline:'', deliverables:'', challenge:'', solution:[],
  schemaVersion:2, categoryFields: categoryFields(category),
  gallery:[{id:'cover',url:'https://example.com/cover.png',publicId:'',mediaId:'',alt:'Project dashboard',order:0,caption:'',ownership:'external'}], coverImageId:'cover', mediaIds:[],
  createdAt:serverTimestamp(), updatedAt:serverTimestamp(),
});
const managedGallery = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `gallery-${index + 1}`,
  url: `https://res.cloudinary.com/test-cloud/image/upload/v1/portfolio/image-${index + 1}.webp`,
  publicId: `portfolio/image/image-${index + 1}`,
  mediaId: `asset-${index + 1}`,
  alt: `Project image ${index + 1}`,
  order: index,
  caption: `Caption ${index + 1}`,
  ownership: 'cloudinary-managed',
}));
const categoryFields = (category: string) => ({
  website: { technologies: ['React'], liveUrl: 'https://example.com', majorFeatures: ['Feature A'], responsiveSupport: '', hostingPlatform: '' },
  webapp: { technologies: ['React'], liveUrl: 'https://example.com/app', majorFeatures: ['Feature A'], userRoles: ['Admin'], backendDatabase: '', authentication: '', hostingPlatform: '' },
  poster: { designTools: ['Figma'], posterType: 'Campaign', targetAudience: 'Customers', designStyle: '', campaignName: '' },
  logo: { designTools: ['Illustrator'], brandIndustry: 'Technology', designStyle: 'Minimal', colourPalette: '', brandBrief: '' },
  automation: { toolsPlatforms: ['n8n'], integrations: ['Firestore'], trigger: 'New record', automatedWorkflow: 'Notify the owner', businessOutcome: 'Faster response', demoUrl: 'https://example.com/demo' },
  app: { technologies: ['React Native'], platform: 'Cross-platform', liveUrl: 'https://example.com/app', majorFeatures: ['Feature A'], appStatus: 'Live' },
}[category]);
const completeProjectV2 = (slug: string, count: number, category = 'website', status = 'draft') => ({
  ...projectV2(slug, category),
  id: slug,
  lastUpdated: '',
  categoryLabel: ({ website: 'Websites', webapp: 'Web Applications', poster: 'Posters', logo: 'Logos', automation: 'Automations', app: 'Apps' } as Record<string, string>)[category],
  tag: ({ website: 'Websites', webapp: 'Web Applications', poster: 'Posters', logo: 'Logos', automation: 'Automations', app: 'Apps' } as Record<string, string>)[category],
  categoryFields: categoryFields(category),
  gallery: managedGallery(count),
  coverImageId: 'gallery-1',
  mediaIds: managedGallery(count).map((item) => item.mediaId),
  status,
});
async function invokeProject(handler: (req: Request, res: Response) => Promise<void>, body: unknown, headers: Record<string, string> = {}) {
  let status = 0;
  let data: any;
  const req = {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', authorization: 'Bearer owner', 'x-firebase-appcheck': 'emulated', ...headers },
    body,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
  const res = {
    setHeader: () => {},
    set statusCode(value: number) { status = value; },
    end: (value: string) => { data = JSON.parse(value); },
  } as unknown as Response;
  await handler(req, res);
  return { status, data };
}
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'access/admin'), { uid: 'owner' });
    await setDoc(doc(db, 'projects/draft'), project('draft'));
    await setDoc(doc(db, 'projects/live'), project('live', 'published'));
    await setDoc(doc(db, 'enquiries/test'), {
      fullName: 'Test',
      email: 'test@example.com',
      status: 'new',
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'services/website'), { published: true });
    await setDoc(doc(db, 'categories/website'), { ...DEFAULT_PROJECT_CATEGORIES.website, updatedAt:Timestamp.now() });
    await setDoc(doc(db, 'categories/private-category'), { ...DEFAULT_PROJECT_CATEGORIES.website, id:'private-category', slug:'private-category', name:'Private category', published:false, updatedAt:Timestamp.now() });
    await setDoc(doc(db, 'settings/public'), {
      headshot: 'https://example.com/photo.png',
      resumeUrl: '',
      availability: '',
      bookingsWindow: '',
      responseWindow: '',
      updatedAt: Timestamp.now(),
    });
  });
});
for (const identity of ['anonymous', 'other']) {
  test(`${identity}: only published reads; no draft, private data, unrestricted query or writes`, async () => {
    const db =
      identity === 'anonymous'
        ? env.unauthenticatedContext().firestore()
        : env.authenticatedContext(identity).firestore();
    await assertSucceeds(getDoc(doc(db, 'projects/live')));
    await assertSucceeds(
      getDocs(query(collection(db, 'projects'), where('status', '==', 'published'))),
    );
    await assertFails(getDoc(doc(db, 'projects/draft')));
    await assertFails(getDocs(collection(db, 'projects')));
    await assertFails(getDoc(doc(db, 'enquiries/test')));
    await assertFails(getDocs(collection(db, 'enquiries')));
    await assertFails(getDoc(doc(db, 'access/admin')));
    await assertFails(setDoc(doc(db, 'access/admin'), { uid: identity }));
    await assertFails(setDoc(doc(db, 'projects/new'), project('new')));
    await assertFails(
      updateDoc(doc(db, 'projects/live'), { status: 'draft', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db, 'projects/draft'), { status: 'published', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      updateDoc(doc(db, 'projects/live'), { order: 2, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(doc(db, 'projects/live')));
    await assertFails(
      setDoc(doc(db, 'enquiries/new'), { email: 'test@example.com', status: 'new' }),
    );
    await assertSucceeds(getDoc(doc(db, 'settings/public')));
    await assertFails(
      updateDoc(doc(db, 'settings/public'), {
        availability: 'changed',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(db, 'enquiryLimits/anything')));
  });
}
test('admin can publish, unpublish and delete while full saves and reorder stay backend-only', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(db, 'projects')));
  await assertFails(setDoc(doc(db, 'projects/new'), project('new')));
  await assertSucceeds(
    updateDoc(doc(db, 'projects/draft'), { status: 'published', updatedAt: serverTimestamp() }),
  );
  await assertSucceeds(
    updateDoc(doc(db, 'projects/draft'), { status: 'draft', updatedAt: serverTimestamp() }),
  );
  const batch = writeBatch(db);
  batch.update(doc(db, 'projects/draft'), { order: 1, updatedAt: serverTimestamp() });
  batch.update(doc(db, 'projects/live'), { order: 0, updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
  await assertSucceeds(deleteDoc(doc(db, 'projects/draft')));
});
test('category reads respect publication and every direct category mutation is denied', async () => {
  const publicDb=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb,'categories/website')));
  await assertFails(getDoc(doc(publicDb,'categories/private-category')));
  const adminDb=env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(adminDb,'categories')));
  await assertFails(setDoc(doc(adminDb,'categories/thumbnail'),{...DEFAULT_PROJECT_CATEGORIES.website,id:'thumbnail',slug:'thumbnail',name:'Thumbnail'}));
  await assertFails(updateDoc(doc(adminDb,'categories/website'),{order:2,updatedAt:serverTimestamp()}));
  await assertFails(deleteDoc(doc(adminDb,'categories/website')));
});

test('legacy direct reorder fails atomically when any rewritten project lacks valid status', async () => {
  const current=readFileSync('firestore.rules','utf8');
  const legacyRules=current
    .replace("hasOnly(['status','updatedAt'])","hasOnly(['status','order','updatedAt'])")
    .replace("&& request.resource.data.status in ['draft','published']\n        && request.resource.data.updatedAt", "&& request.resource.data.status in ['draft','published']\n        && request.resource.data.order is int && request.resource.data.order >= 0\n        && request.resource.data.updatedAt");
  const legacy=await initializeTestEnvironment({projectId:'demo-portfolio-legacy-reorder',firestore:{host:'127.0.0.1',port:8080,rules:legacyRules}});
  try{
    await legacy.withSecurityRulesDisabled(async(context)=>{
      const db=context.firestore();
      await setDoc(doc(db,'access/admin'),{uid:'owner'});
      await setDoc(doc(db,'projects/valid'),project('valid','draft'));
      await setDoc(doc(db,'projects/legacy'),{slug:'legacy',title:'Legacy',order:1,updatedAt:Timestamp.now()});
    });
    const db=legacy.authenticatedContext('owner').firestore();
    const batch=writeBatch(db);
    batch.update(doc(db,'projects/valid'),{order:1,updatedAt:serverTimestamp()});
    batch.update(doc(db,'projects/legacy'),{order:0,updatedAt:serverTimestamp()});
    await assertFails(batch.commit());
  }finally{await legacy.cleanup();}
});
test('direct project creates are denied even to admins', async () => {
  const db=env.authenticatedContext('owner').firestore();
  await assertFails(setDoc(doc(db,'projects/gallery'),projectV2('gallery')));
  const six=Array.from({length:6},(_,index)=>({id:`image-${index}`,url:`https://example.com/${index}.png`,alt:`Image ${index}`,order:index,ownership:'external'}));
  await assertFails(setDoc(doc(db,'projects/too-many'),{...projectV2('too-many'),gallery:six,coverImageId:'image-0'}));
  await assertFails(setDoc(doc(db,'projects/bad-cover'),{...projectV2('bad-cover'),coverImageId:'missing'}));
  await assertFails(setDoc(doc(db,'projects/logo-link'),{...projectV2('logo-link','logo'),categoryFields:{designStyle:'Minimal',liveUrl:'https://example.com'}}));
  await assertFails(setDoc(doc(db,'projects/new-banner'),{...projectV2('new-banner'),bannerImage:'https://example.com/banner.png'}));
});
test('only admin can permanently delete an enquiry and create a content-free audit record', async () => {
  const outsider=env.authenticatedContext('other').firestore();
  await assertFails(deleteDoc(doc(outsider,'enquiries/test')));
  const db=env.authenticatedContext('owner').firestore(); const batch=writeBatch(db);
  batch.delete(doc(db,'enquiries/test'));
  batch.set(doc(db,'auditLogs/enquiry-delete'),{action:'enquiry.delete',entityType:'enquiry',entityId:'test',adminUid:'owner',summary:'Permanently deleted enquiry record',result:'success',createdAt:serverTimestamp()});
  await assertSucceeds(batch.commit());
  assert.equal((await getDoc(doc(db,'enquiries/test'))).exists(),false);
});
test('admin cannot change authorization or save invalid projects and URLs', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDoc(doc(db, 'access/admin')));
  await assertFails(setDoc(doc(db, 'access/admin'), { uid: 'other' }));
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), slug: 'different' }));
  await assertFails(
    setDoc(doc(db, 'projects/new'), { ...project('new'), liveUrl: 'javascript:alert(1)' }),
  );
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), status: 'invalid' }));
  await assertFails(setDoc(doc(db, 'projects/new'), { ...project('new'), secret: 'hidden data' }));
});
test('enquiry updates only change status; settings accept real PDF paths', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(getDocs(collection(db, 'enquiries')));
  await assertSucceeds(updateDoc(doc(db, 'enquiries/test'), { status: 'reviewed' }));
  await assertFails(updateDoc(doc(db, 'enquiries/test'), { email: 'changed@example.com' }));
  await assertFails(updateDoc(doc(db, 'enquiries/test'), { status: 'invalid' }));
  await assertSucceeds(
    updateDoc(doc(db, 'settings/public'), {
      resumeUrl: '/resume.pdf',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(db, 'settings/public'), {
      resumeUrl: 'javascript:alert(1)',
      updatedAt: serverTimestamp(),
    }),
  );
});
test('unpublishing and revoking admin access deny subsequent reads', async () => {
  const db = env.authenticatedContext('owner').firestore();
  await assertSucceeds(
    updateDoc(doc(db, 'projects/live'), { status: 'draft', updatedAt: serverTimestamp() }),
  );
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'projects/live')));
  await env.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore(), 'access/admin'), { uid: 'replacement' }),
  );
  await assertFails(getDocs(collection(db, 'projects')));
  await assertFails(
    updateDoc(doc(db, 'projects/live'), { status: 'published', updatedAt: serverTimestamp() }),
  );
});

test('project save API accepts one through five images, all categories and atomic edits', async () => {
  const app = initializeApp({ projectId: 'demo-portfolio' }, 'project-save-integration-test');
  try {
    const db = getFirestore(app);
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    for (const item of managedGallery(5)) await db.doc(`media/${item.mediaId}`).set({ assetId:item.mediaId, publicId:item.publicId, secureUrl:item.url, ownership:'cloudinary-managed', status:'active' });
    const handler = createProjectSaveHandler(() => ({
      db,
      auth: { verifyIdToken: async () => ({ uid:'owner' }), getUser: async () => ({ customClaims:{} }) },
      appCheck: { verifyToken: async () => ({}) },
    }) as unknown as Services);

    for (const status of ['draft', 'published']) {
      for (let count = 1; count <= 5; count++) {
        const slug = `api-${status}-${count}`;
        assert.equal((await invokeProject(handler, { project:completeProjectV2(slug,count,'website',status), creating:true })).status, 201);
        assert.equal((await invokeProject(handler, { project:{...completeProjectV2(slug,count,'website',status),summary:`Edited ${count}`}, creating:false })).status, 200);
      }
    }
    const categoriesToTest = ['website','webapp','poster','logo','automation','app'];
    for (const category of categoriesToTest) {
      const slug = `category-${category}`;
      assert.equal((await invokeProject(handler, { project:completeProjectV2(slug,1,category), creating:true })).status, 201);
      assert.equal((await db.doc(`projects/${slug}`).get()).data()?.category, category);
    }
    assert.equal((await invokeProject(handler, { project:completeProjectV2('api-six',6), creating:true })).status, 400);
    assert.equal((await invokeProject(handler, { project:{...completeProjectV2('invalid-media',1),gallery:[{...managedGallery(1)[0],mediaId:'missing'}],mediaIds:['missing']}, creating:true })).status, 400);
    assert.equal((await db.collection('auditLogs').where('entityType','==','project').get()).size, 26);
    assert.equal((await db.collection('contentRevisions').where('entityType','==','project').get()).size, 10);
  } finally {
    await deleteApp(app);
  }
});

test('project save API supports gallery edits, duplication and authorization failures', async () => {
  const app = initializeApp({ projectId: 'demo-portfolio' }, 'project-operations-integration-test');
  try {
    const db = getFirestore(app);
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    for (const item of managedGallery(5)) await db.doc(`media/${item.mediaId}`).set({ assetId:item.mediaId, publicId:item.publicId, secureUrl:item.url, ownership:'cloudinary-managed', status:'active' });
    const services = (uid = 'owner', appCheckValid = true) => () => ({
      db,
      auth: { verifyIdToken: async () => ({ uid }), getUser: async () => ({ customClaims:{} }) },
      appCheck: { verifyToken: async () => { if (!appCheckValid) throw new Error('invalid'); return {}; } },
    }) as unknown as Services;
    const handler = createProjectSaveHandler(services());
    const slug = 'gallery-operations';
    let value = completeProjectV2(slug, 3);
    assert.equal((await invokeProject(handler,{project:value,creating:true})).status,201);
    const save = async (projectValue: typeof value) => {
      value = projectValue;
      assert.equal((await invokeProject(handler,{project:value,creating:false})).status,200);
    };
    await save({...value,gallery:managedGallery(4),mediaIds:managedGallery(4).map((item)=>item.mediaId)});
    await save({...value,gallery:managedGallery(3),mediaIds:managedGallery(3).map((item)=>item.mediaId)});
    const replacement=[managedGallery(3)[0],managedGallery(5)[4],managedGallery(3)[2]].map((item,order)=>({...item,order}));
    await save({...value,gallery:replacement,mediaIds:replacement.map((item)=>item.mediaId)});
    const reordered=[replacement[2],replacement[0],replacement[1]].map((item,order)=>({...item,order}));
    await save({...value,gallery:reordered,mediaIds:reordered.map((item)=>item.mediaId),coverImageId:reordered[0].id});
    const described=reordered.map((item,index)=>index===1?{...item,alt:'Updated alt text',caption:'Updated caption'}:item);
    await save({...value,gallery:described,mediaIds:described.map((item)=>item.mediaId)});
    await save({...value});
    await save({...value,category:'logo',categoryLabel:'Logos',tag:'Logos',categoryFields:categoryFields('logo')});
    const copy={...value,id:'gallery-operations-copy',slug:'gallery-operations-copy',title:'Copy of Gallery Operations',status:'draft'};
    assert.equal((await invokeProject(handler,{project:copy,creating:true})).status,201);
    assert.equal((await db.collection('contentRevisions').where('entityId','==',slug).get()).size,7);
    assert.equal((await invokeProject(createProjectSaveHandler(services('other')),{project:completeProjectV2('outsider',1),creating:true})).status,403);
    assert.equal((await invokeProject(createProjectSaveHandler(services('owner',false)),{project:completeProjectV2('bad-check',1),creating:true})).status,403);
    assert.equal((await invokeProject(handler,{project:completeProjectV2('missing-token',1),creating:true},{authorization:''})).status,401);
  } finally {
    await deleteApp(app);
  }
});

test('protected category API supports dynamic thumbnail CRUD, state changes, reorder and guarded deletion', async () => {
  const app=initializeApp({projectId:'demo-portfolio'},'category-api-integration-test');
  try{
    const db=getFirestore(app);
    process.env.ALLOWED_ORIGINS='http://localhost:3000';
    const services=(uid='owner',validCheck=true)=>()=>({
      db,
      auth:{verifyIdToken:async()=>({uid}),getUser:async()=>({customClaims:{}})},
      appCheck:{verifyToken:async()=>{if(!validCheck)throw new Error('invalid');return{};}},
    }) as unknown as Services;
    const handler=createCategoryManageHandler(services());
    const thumbnail={
      id:'thumbnail',name:'Thumbnails',slug:'thumbnail',description:'Video and social thumbnails.',order:9,published:false,enabled:true,
      mediaConfig:{defaultRatio:'16:9' as const,recommendedWidth:1280,recommendedHeight:720,guidance:'Recommended 1280 x 720 px',defaultFit:'contain' as const},
      fields:[{key:'designTools',label:'Design tools',type:'list' as const,required:false},{key:'channelUrl',label:'Channel URL',type:'url' as const,required:false}],
      cta:{label:'View channel',urlField:'channelUrl'},schemaVersion:2 as const,
    };
    assert.equal((await invokeProject(handler,{action:'save',category:thumbnail,creating:true})).status,201);
    assert.equal((await invokeProject(handler,{action:'save',category:thumbnail,creating:true})).status,409);
    assert.equal((await invokeProject(handler,{action:'save',category:{...thumbnail,name:'Thumbnail Designs'},creating:false})).status,200);
    assert.equal((await invokeProject(handler,{action:'publish',id:'thumbnail'})).status,200);
    assert.equal((await invokeProject(handler,{action:'unpublish',id:'thumbnail'})).status,200);
    assert.equal((await invokeProject(handler,{action:'publish',id:'thumbnail'})).status,200);
    assert.equal((await invokeProject(handler,{action:'disable',id:'thumbnail'})).status,200);
    assert.equal((await invokeProject(handler,{action:'enable',id:'thumbnail'})).status,200);
    assert.equal((await invokeProject(handler,{action:'reorder',id:'thumbnail',direction:-1})).status,200);
    const saved=(await db.doc('categories/thumbnail').get()).data();
    assert.equal(saved?.published,true);
    assert.equal(saved?.enabled,true);
    assert.equal(saved?.schemaVersion,2);
    assert.equal(saved?.name,'Thumbnail Designs');
    assert.equal((await invokeProject(handler,{action:'save',category:{...thumbnail,id:'Bad ID',slug:'Bad ID'},creating:true})).status,400);
    assert.equal((await invokeProject(handler,{action:'save',category:{...thumbnail,id:'malformed',slug:'malformed',fields:[{key:'bad-key',label:'Bad',type:'select',required:false,options:[]}]},creating:true})).status,400);
    assert.equal((await invokeProject(createCategoryManageHandler(services('other')),{action:'save',category:{...thumbnail,id:'outsider-category',slug:'outsider-category'},creating:true})).status,403);
    assert.equal((await invokeProject(createCategoryManageHandler(services('other')),{action:'publish',id:'thumbnail'})).status,403);
    assert.equal((await invokeProject(createCategoryManageHandler(services('other')),{action:'delete',id:'thumbnail'})).status,403);
    assert.equal((await invokeProject(createCategoryManageHandler(services('owner',false)),{action:'publish',id:'thumbnail'})).status,403);
    assert.equal((await invokeProject(handler,{action:'publish',id:'thumbnail'},{authorization:''})).status,401);
    assert.equal((await invokeProject(handler,{action:'save',category:thumbnail,creating:false},{authorization:''})).status,401);

    const social={...thumbnail,id:'social-media-design',slug:'social-media-design',name:'Social Media Designs',order:10,fields:[{key:'platform',label:'Platform',type:'select' as const,required:true,options:['Instagram','Facebook','Other']}],cta:undefined};
    assert.equal((await invokeProject(handler,{action:'save',category:social,creating:true})).status,201);
    assert.equal((await invokeProject(handler,{action:'delete',id:'social-media-design'})).status,200);

    const item=managedGallery(1)[0];
    await db.doc(`media/${item.mediaId}`).set({assetId:item.mediaId,publicId:item.publicId,secureUrl:item.url,ownership:'cloudinary-managed',status:'active'});
    const dynamic={...completeProjectV2('thumbnail-project',1),category:'thumbnail',categoryLabel:'Thumbnails',tag:'Thumbnails',categoryFields:{designTools:['Canva'],channelUrl:'https://example.com/channel'}};
    assert.equal((await invokeProject(createProjectSaveHandler(services()),{project:dynamic,creating:true})).status,201);
    assert.equal((await invokeProject(handler,{action:'delete',id:'thumbnail'})).status,409);
    await db.doc('projects/thumbnail-project').delete();
    assert.equal((await invokeProject(handler,{action:'delete',id:'thumbnail'})).status,200);
    assert.equal((await db.doc('categories/thumbnail').get()).exists,false);
    assert.ok((await db.collection('auditLogs').where('entityType','==','category').get()).size>=6);
  }finally{await deleteApp(app);}
});

test('protected project reorder normalizes duplicate and missing orders, including legacy records', async () => {
  const app=initializeApp({projectId:'demo-portfolio'},'project-reorder-integration-test');
  try{
    const db=getFirestore(app);
    process.env.ALLOWED_ORIGINS='http://localhost:3000';
    const existing=await db.collection('projects').get();
    await Promise.all(existing.docs.map((entry)=>entry.ref.delete()));
    await db.doc('projects/coffee-hub').set({title:'Coffee HUB',status:'published',order:0});
    await db.doc('projects/krishnas-kitchen').set({title:"Krishna's Kitchen",status:'published',order:1});
    await db.doc('projects/legacy-no-status').set({title:'Legacy without status',order:1});
    await db.doc('projects/ab-collection').set({title:'AB Collection by Aadya E - Commerce Website',status:'published'});
    const services=(uid='owner',validCheck=true)=>()=>({
      db,
      auth:{verifyIdToken:async()=>({uid}),getUser:async()=>({customClaims:{}})},
      appCheck:{verifyToken:async()=>{if(!validCheck)throw new Error('invalid');return{};}},
    }) as unknown as Services;
    const handler=createProjectReorderHandler(services());
    assert.deepEqual((await Promise.all([invokeProject(handler,{id:'ab-collection',direction:-1}),invokeProject(handler,{id:'ab-collection',direction:-1})])).map((result)=>result.status),[200,200]);
    assert.equal((await invokeProject(handler,{id:'ab-collection',direction:-1})).status,200);
    let ordered=(await db.collection('projects').orderBy('order').get()).docs.map((entry)=>({id:entry.id,order:entry.data().order}));
    assert.equal(ordered[0].id,'ab-collection');
    assert.deepEqual(ordered.map((entry)=>entry.order),ordered.map((_,index)=>index));
    assert.equal(new Set(ordered.map((entry)=>entry.order)).size,ordered.length);
    const before=ordered.map((entry)=>entry.id);
    assert.equal((await invokeProject(handler,{id:'ab-collection',direction:-1})).status,200);
    assert.deepEqual((await db.collection('projects').orderBy('order').get()).docs.map((entry)=>entry.id),before);
    assert.equal((await invokeProject(handler,{id:'krishnas-kitchen',direction:1})).status,200);
    ordered=(await db.collection('projects').orderBy('order').get()).docs.map((entry)=>({id:entry.id,order:entry.data().order}));
    const last=ordered.at(-1)!.id;
    assert.equal((await invokeProject(handler,{id:last,direction:1})).status,200);
    assert.equal((await db.doc(`projects/${last}`).get()).data()?.order,ordered.length-1);
    assert.equal((await invokeProject(createProjectReorderHandler(services('other')),{id:'coffee-hub',direction:1})).status,403);
    assert.equal((await invokeProject(createProjectReorderHandler(services('owner',false)),{id:'coffee-hub',direction:1})).status,403);
    assert.equal((await invokeProject(handler,{id:'coffee-hub',direction:1},{authorization:''})).status,401);
    assert.equal((await invokeProject(handler,{id:'coffee-hub',direction:0})).status,400);
  }finally{await deleteApp(app);}
});

test('real enquiry transactions persist once under concurrent retries and remain private', async () => {
  const app = initializeApp({ projectId: 'demo-portfolio' }, 'enquiry-integration-test');
  try {
    const db = getFirestore(app);
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.ENQUIRY_RATE_LIMIT_SECRET = 'emulator-test-only';
    const handler = createEnquiryHandler(
      () => ({ db, appCheck: { verifyToken: async () => ({}) } }) as unknown as Services,
    );
    const id = '00000000-0000-4000-8000-000000000042';
    const send = async () => {
      let status = 0;
      const req = {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'content-type': 'application/json',
          'x-firebase-appcheck': 'emulated',
        },
        socket: { remoteAddress: '127.0.0.1' },
        body: {
          id,
          fullName: 'Test Visitor',
          email: 'visitor@example.com',
          phone: '',
          service: 'website',
          budget: 'Not specified',
          description: 'Please help me build a business website.',
        },
      } as unknown as Request;
      const res = {
        setHeader: () => {},
        set statusCode(value: number) {
          status = value;
        },
        end: () => {},
      } as unknown as Response;
      await handler(req, res);
      return status;
    };
    assert.deepEqual(await Promise.all([send(), send()]), [201, 201]);
    const saved = await db.doc(`enquiries/${id}`).get();
    assert.equal(saved.data()?.fullName, 'Test Visitor');
    assert.equal(saved.data()?.status, 'new');
    assert.ok(saved.data()?.createdAt.toMillis() > 0);
    const limits = await db.collection('enquiryLimits').get();
    assert.equal(limits.size, 1);
    assert.equal(limits.docs[0].data().count, 1);
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'enquiries', id)));
  } finally {
    await deleteApp(app);
  }
});
