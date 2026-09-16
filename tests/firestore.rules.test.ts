import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createEnquiryHandler, createProjectSaveHandler, type Services } from '../server/handlers';
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
test('admin can publish, unpublish, reorder and delete while full saves stay backend-only', async () => {
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
  await assertSucceeds(batch.commit());
  await assertSucceeds(deleteDoc(doc(db, 'projects/draft')));
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
