import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { validateEnquiry, slugify, httpsUrl, pdfUrl } from '../src/lib/validation';
import { parseRoute } from '../src/lib/routes';
import { signUpload } from '../server/signature';
import { createSignHandler, createEnquiryHandler, createMediaDeleteHandler, type Services } from '../server/handlers';
import { canonicalCategoryFields, normalizeProject, normalizeProjectCategory, projectCta, projectWriteFields, removedManagedMediaIds, sanitizeCategoryFields, significantRatioDifference } from '../src/lib/projects';
import type { Request, Response } from '../server/http';

const valid = {
  fullName: 'Test Visitor',
  email: 'test@example.com',
  phone: '',
  service: 'website',
  budget: 'Not specified',
  description: 'Please help create a portfolio website for my work.',
};
const id = '00000000-0000-4000-8000-000000000001';
test('patched transitive UUID remains compatible with the Google HTTP multipart client', async () => {
  const require = createRequire(import.meta.url);
  const storageRequire = createRequire(require.resolve('@google-cloud/storage'));
  const { Gaxios } = storageRequire('gaxios');
  const result = await new Gaxios().request({
    url: 'https://example.invalid',
    method: 'POST',
    multipart: [{ headers: { 'Content-Type': 'text/plain' }, content: 'test' }],
    adapter: async (options: any) => {
      assert.match(options.headers['Content-Type'], /^multipart\/related; boundary=[0-9a-f-]{36}$/);
      let body = '';
      for await (const chunk of options.body) body += chunk;
      assert.match(body, /test/);
      return { config: options, status: 200, statusText: 'OK', headers: {}, data: 'ok' };
    },
  });
  assert.equal(result.data, 'ok');
});
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.ENQUIRY_RATE_LIMIT_SECRET = 'test-only-not-a-real-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'server-only-test-secret';
process.env.CLOUDINARY_IMAGE_PRESET = 'portfolio-images';
process.env.CLOUDINARY_RESUME_PRESET = 'portfolio-resume';
delete process.env.VERCEL;
type Handler = (req: Request, res: Response) => Promise<void>;
async function invoke(
  handler: Handler,
  body: unknown,
  headers: Record<string, string> = {},
  method = 'POST',
) {
  let status = 0,
    data: any;
  const responseHeaders: Record<string, unknown> = {};
  const req = {
    method,
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
  const res = {
    setHeader: (key: string, value: unknown) => {
      responseHeaders[key] = value;
    },
    set statusCode(value: number) {
      status = value;
    },
    end: (value: string) => {
      data = JSON.parse(value);
    },
  } as unknown as Response;
  await handler(req, res);
  return { status, data, headers: responseHeaders };
}
function fixture(uid = 'owner', tokenValid = true, appCheckValid = true) {
  const documents = new Map<string, any>([['access/admin', { uid: 'owner' }], ['services/website', { published: true }]]);
  let revocationChecked = false;
  const snapshot = (path: string) => ({
    exists: documents.has(path),
    data: () => documents.get(path),
  });
  const services = () =>
    ({
      auth: {
        verifyIdToken: async (_token: string, revoked: boolean) => {
          revocationChecked = revoked;
          if (!tokenValid) throw Error('invalid');
          return { uid };
        },
        getUser: async () => ({ customClaims: {} }),
      },
      appCheck: {
        verifyToken: async () => {
          if (!appCheckValid) throw Error('invalid');
          return {};
        },
      },
      db: {
        doc: (path: string) => ({ path, get: async () => snapshot(path) }),
        runTransaction: async (callback: any) =>
          callback({
            get: async (ref: any) => snapshot(ref.path),
            set: (ref: any, value: any) => documents.set(ref.path, value),
            create: (ref: any, value: any) => documents.set(ref.path, value),
          }),
      },
    }) as unknown as Services;
  return { services, documents, checked: () => revocationChecked };
}

function mediaFixture(referenced = false) {
  const documents = new Map<string, any>([
    ['access/admin',{uid:'owner'}],
    ['media/managed',{assetId:'managed',publicId:'portfolio/image/managed',resourceType:'image',ownership:'cloudinary-managed'}],
  ]);
  let audit=0;
  const ref=(path:string)=>({path,get:async()=>({exists:documents.has(path),data:()=>documents.get(path)}),set:async(value:any)=>documents.set(path,value),delete:async()=>documents.delete(path)});
  const services=()=>({
    auth:{verifyIdToken:async()=>({uid:'owner'}),getUser:async()=>({customClaims:{admin:true}})},
    appCheck:{verifyToken:async()=>({})},
    db:{
      doc:ref,
      collection:(name:string)=>({
        doc:(id?:string)=>ref(`${name}/${id||`generated-${++audit}`}`),
        where:()=>({limit:()=>({get:async()=>({empty:!referenced})})}),
      }),
      runTransaction:async(callback:any)=>callback({delete:(target:any)=>documents.delete(target.path),set:(target:any,value:any)=>documents.set(target.path,value)}),
    },
  }) as unknown as Services;
  return {services,documents};
}

test('validation trims input and rejects malformed or oversized enquiries', () => {
  assert.equal(
    validateEnquiry({ ...valid, fullName: '  Test Visitor  ', email: 'TEST@EXAMPLE.COM' }).email,
    'test@example.com',
  );
  for (const data of [
    { ...valid, email: 'bad' },
    { ...valid, description: 'short' },
    { ...valid, description: 'x'.repeat(5001) },
    { ...valid, phone: 'javascript:' },
    { ...valid, service: 'unknown' },
    { ...valid, fullName: '' },
    { ...valid, email: {} },
  ])
    assert.throws(() => validateEnquiry(data));
});
test('slugs, URLs and routes reject unsafe values and ambiguous admin paths', () => {
  assert.equal(slugify('My Project / Café!'), 'my-project-cafe');
  assert.equal(httpsUrl('javascript:alert(1)'), false);
  assert.equal(httpsUrl('https://user:pass@example.com'), false);
  assert.equal(pdfUrl('/resume.pdf'), true);
  assert.equal(pdfUrl('https://example.com/resume.pdf'), true);
  assert.equal(pdfUrl('https://example.com/resume.html'), false);
  assert.deepEqual(parseRoute('/projects/my-project'), { kind: 'project', slug: 'my-project' });
  assert.deepEqual(parseRoute('/admin/preview/my-draft'), { kind: 'preview', slug: 'my-draft' });
  assert.equal(parseRoute('/administrator').kind, 'missing');
  assert.equal(parseRoute('/projects/%2Fsecret').kind, 'missing');
});
test('signer follows the Cloudinary sorted SHA-256 parameter contract', () => {
  assert.equal(
    signUpload({ timestamp: 123, overwrite: false, public_id: 'portfolio/image/test' }, 'secret'),
    createHash('sha256')
      .update('overwrite=false&public_id=portfolio/image/test&timestamp=123secret')
      .digest('hex'),
  );
});
test('sign endpoint requires POST, trusted origin and a bearer token', async () => {
  const handler = createSignHandler(fixture().services);
  assert.equal((await invoke(handler, {}, {}, 'GET')).status, 405);
  assert.equal((await invoke(handler, {}, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await invoke(handler, { kind: 'image' })).status, 401);
});
test('sign endpoint rejects invalid, revoked and non-admin sessions', async () => {
  assert.equal(
    (
      await invoke(
        createSignHandler(fixture('owner', false).services),
        { kind: 'image' },
        { authorization: 'Bearer invalid' },
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await invoke(
        createSignHandler(fixture('someone-else').services),
        { kind: 'image' },
        { authorization: 'Bearer user', 'x-firebase-appcheck': 'check' },
      )
    ).status,
    403,
  );
});
test('sign endpoint signs only fixed parameters and never returns the secret', async () => {
  const f = fixture();
  const handler = createSignHandler(f.services);
  const result = await invoke(handler, { kind: 'image' }, { authorization: 'Bearer owner', 'x-firebase-appcheck': 'check' });
  assert.equal(result.status, 200);
  assert.equal(f.checked(), true);
  assert.equal(result.data.params.allowed_formats, 'jpg,jpeg,png,webp');
  assert.equal(result.data.params.overwrite, false);
  assert.match(result.data.params.public_id, /^portfolio\/image\/[0-9a-f-]+$/);
  assert.equal(JSON.stringify(result).includes(process.env.CLOUDINARY_API_SECRET!), false);
  assert.equal(
    (
      await invoke(
        handler,
        { kind: 'image', public_id: 'other/file' },
        { authorization: 'Bearer owner', 'x-firebase-appcheck': 'check' },
      )
    ).status,
    400,
  );
  const pdf = await invoke(handler, { kind: 'resume' }, { authorization: 'Bearer owner', 'x-firebase-appcheck': 'check' });
  assert.equal(pdf.data.params.allowed_formats, 'pdf');
  assert.equal(pdf.data.params.upload_preset, 'portfolio-resume');
});
test('enquiry endpoint requires verification and valid input before storing', async () => {
  const f = fixture();
  const handler = createEnquiryHandler(f.services);
  assert.equal((await invoke(handler, { ...valid, id })).status, 403);
  assert.equal(
    (await invoke(handler, { ...valid, id, email: 'invalid' }, { 'x-firebase-appcheck': 'token' }))
      .status,
    400,
  );
  assert.equal(
    (await invoke(handler, { ...valid, id, website: 'spam' }, { 'x-firebase-appcheck': 'token' }))
      .status,
    400,
  );
  assert.equal(
    (
      await invoke(
        createEnquiryHandler(fixture('owner', true, false).services),
        { ...valid, id },
        { 'x-firebase-appcheck': 'invalid' },
      )
    ).status,
    403,
  );
  assert.equal(f.documents.has(`enquiries/${id}`), false);
});
test('enquiries persist once, strip privileged fields, and do not claim email delivery', async () => {
  const f = fixture();
  const handler = createEnquiryHandler(f.services);
  const body = { ...valid, id, status: 'contacted', createdAt: 'fake' };
  const first = await invoke(handler, body, { 'x-firebase-appcheck': 'valid' });
  assert.equal(first.status, 201);
  assert.deepEqual(first.data, { saved: true, id });
  assert.equal(f.documents.get(`enquiries/${id}`).status, 'new');
  assert.equal((await invoke(handler, body, { 'x-firebase-appcheck': 'valid' })).status, 201);
  assert.equal([...f.documents.keys()].filter((key) => key.startsWith('enquiries/')).length, 1);
  assert.equal(
    (
      await invoke(
        handler,
        { ...body, description: valid.description + ' changed' },
        { 'x-firebase-appcheck': 'valid' },
      )
    ).status,
    409,
  );
});
test('enquiry endpoint rate limits after five accepted submissions per IP per hour', async () => {
  const f = fixture();
  const handler = createEnquiryHandler(f.services);
  for (let i = 1; i <= 6; i++) {
    const result = await invoke(
      handler,
      { ...valid, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` },
      { 'x-firebase-appcheck': 'token' },
    );
    assert.equal(result.status, i <= 5 ? 201 : 429);
  }
  assert.equal(
    [...f.documents.keys()].some((key) => key.includes('127.0.0.1')),
    false,
  );
});
test('backend errors fail closed without leaking internal errors', async () => {
  const result = await invoke(
    createSignHandler(() => {
      throw Error('private-secret');
    }),
    { kind: 'image' },
    { authorization: 'Bearer token' },
  );
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result).includes('private-secret'), false);
});

test('legacy single images migrate idempotently into an ordered cover gallery', () => {
  const first = normalizeProject({ id:'legacy', slug:'legacy', title:'Legacy project', category:'website', categoryLabel:'Websites', tag:'Websites', summary:'Summary', role:'', status:'published', order:0, lastUpdated:'', image:'https://example.com/legacy.png', technologies:['React'], liveUrl:'https://example.com' });
  const second = normalizeProject(first as typeof first & Record<string, unknown>);
  assert.equal(first.gallery.length, 1);
  assert.equal(first.gallery[0].url, 'https://example.com/legacy.png');
  assert.equal(first.coverImageId, first.gallery[0].id);
  assert.deepEqual(second.gallery, first.gallery);
  assert.deepEqual(first.categoryFields.technologies, ['React']);
});

test('gallery writes enforce limits, stable ordering, cover selection and managed identifiers', () => {
  const project = normalizeProject({ id:'gallery', slug:'gallery', title:'Gallery', category:'website', categoryLabel:'Websites', tag:'Websites', summary:'Summary', role:'', status:'draft', order:0, lastUpdated:'', categoryFields:{technologies:['React']}, gallery:[{id:'second',url:'https://example.com/2.png',alt:'Second',order:2,ownership:'external'},{id:'first',url:'https://example.com/1.png',alt:'First',order:0,ownership:'external'}], coverImageId:'second', mediaIds:[], schemaVersion:2 });
  assert.deepEqual(project.gallery.map((item) => item.id), ['first','second']);
  assert.equal(project.coverImageId, 'second');
  assert.throws(() => projectWriteFields({ ...project, gallery: [...project.gallery, ...[3,4,5,6].map((number) => ({ id:String(number),url:`https://example.com/${number}.png`,alt:String(number),order:number,ownership:'external' as const }))] }), /between 1 and 5/);
  assert.throws(() => projectWriteFields({ ...project, gallery:[{id:'managed',url:'https://example.com/m.png',alt:'Managed',order:0,ownership:'cloudinary-managed'}], coverImageId:'managed' }), /media identifiers/);
});

test('category configuration clears incompatible data and exposes only valid contextual CTAs', () => {
  assert.deepEqual(sanitizeCategoryFields('logo',{liveUrl:'https://example.com',designStyle:'Minimal'}),{designStyle:'Minimal'});
  const logo=normalizeProject({id:'logo',slug:'logo',title:'Logo',category:'logo',summary:'Summary',role:'',status:'published',order:0,lastUpdated:'',categoryFields:{designStyle:'Minimal'},gallery:[{id:'one',url:'https://example.com/logo.png',alt:'Logo mark',order:0,ownership:'external'}],coverImageId:'one',mediaIds:[],schemaVersion:2});
  assert.equal(projectCta(logo),null);
  const site=normalizeProject({...logo,id:'site',slug:'site',category:'website',categoryFields:{liveUrl:'https://example.com'}});
  assert.deepEqual(projectCta(site),{label:'Visit Website',url:'https://example.com'});
  assert.equal(significantRatioDifference(1600,900,'website'),false);
  assert.equal(significantRatioDifference(900,1600,'website'),true);
});

test('category normalization keeps labels and edit forms aligned for legacy records', () => {
  assert.equal(normalizeProjectCategory(undefined,'Logos'), 'logo');
  assert.equal(normalizeProjectCategory('website','Logos'), 'website');
  const legacyLogo=normalizeProject({id:'legacy-logo',slug:'legacy-logo',title:'Legacy logo',categoryLabel:'Logos',summary:'Summary',role:'',status:'draft',order:0,lastUpdated:'',gallery:[{id:'one',url:'https://example.com/logo.png',alt:'Logo',order:0,ownership:'external'}],coverImageId:'one',mediaIds:[],schemaVersion:2});
  assert.equal(legacyLogo.category,'logo');
  assert.equal(legacyLogo.categoryLabel,'Logos');
  const mislabeled=normalizeProject({...legacyLogo,category:'website',categoryLabel:'Logos'});
  assert.equal(mislabeled.category,'website');
  assert.equal(mislabeled.categoryLabel,'Websites');
});

test('project writes canonicalize multiline lists and reject unsupported nested fields', () => {
  const project=normalizeProject({id:'canonical',slug:'canonical',title:'Canonical',category:'webapp',summary:'Summary',role:'',status:'draft',order:0,lastUpdated:'',categoryFields:{technologies:['React','Firebase'],majorFeatures:['Auth','CMS'],userRoles:['Admin']},gallery:[{id:'one',url:'https://example.com/app.png',alt:'Application',order:0,ownership:'external'}],coverImageId:'one',mediaIds:[],schemaVersion:2});
  const fields=projectWriteFields(project);
  assert.deepEqual(fields.categoryFields,canonicalCategoryFields('webapp',project.categoryFields));
  assert.deepEqual(fields.categoryFields.majorFeatures,['Auth','CMS']);
  assert.equal(Object.values(fields.categoryFields).includes(undefined as never),false);
  assert.deepEqual(fields.gallery[0],{id:'one',url:'https://example.com/app.png',publicId:'',mediaId:'',alt:'Application',order:0,caption:'',ownership:'external'});
  assert.throws(()=>projectWriteFields({...project,categoryFields:{...project.categoryFields,unexpected:'x'} as any}),/do not belong/);
  assert.throws(()=>projectWriteFields({...project,gallery:[{...project.gallery[0],unexpected:'x'} as any]}),/unsupported fields/);
  assert.throws(()=>projectWriteFields({...project,categoryFields:{...project.categoryFields,majorFeatures:['A',['nested']] as any}}),/one-per-line/);
  assert.throws(()=>projectWriteFields({...project,fullDescription:{unsafe:true} as any}),/fullDescription/);
  assert.throws(()=>projectWriteFields({...project,solution:['Valid',['nested']] as any}),/Solution/);
});

test('public project media contains no fake browser chrome or case-study banner rendering', () => {
  const work=readFileSync('src/components/WorkSection.tsx','utf8');
  const detail=readFileSync('src/components/ProjectDetailView.tsx','utf8');
  const editor=readFileSync('src/components/ProjectModal.tsx','utf8');
  const admin=readFileSync('src/components/AdminDashboardView.tsx','utf8');
  assert.equal(/Browser Header Bar|RotateCw|project\.liveUrl \|\| project\.title/.test(work),false);
  assert.equal(/bannerImage/.test(detail),false);
  assert.equal(/Case study banner/.test(editor),false);
  assert.equal(/New Project Entry|btn-sidebar-add-project|Project Table/.test(admin),false);
});

test('replacement cleanup selects only removed managed assets after the new project state exists', () => {
  const previous=normalizeProject({id:'p',slug:'p',title:'P',category:'website',summary:'Summary',role:'',status:'draft',order:0,lastUpdated:'',categoryFields:{},gallery:[{id:'old',url:'https://example.com/old.png',alt:'Old',order:0,ownership:'cloudinary-managed',mediaId:'old-media',publicId:'portfolio/image/old'},{id:'shared',url:'https://example.com/shared.png',alt:'Shared',order:1,ownership:'cloudinary-managed',mediaId:'shared-media',publicId:'portfolio/image/shared'}],coverImageId:'old',mediaIds:['old-media','shared-media'],schemaVersion:2});
  const next=normalizeProject({...previous,gallery:[previous.gallery[1],{id:'new',url:'https://example.com/new.png',alt:'New',order:1,ownership:'cloudinary-managed',mediaId:'new-media',publicId:'portfolio/image/new'}],coverImageId:'new'});
  assert.deepEqual(removedManagedMediaIds(previous,next),['old-media']);
});

test('media deletion protects references and creates a retryable cleanup job on Cloudinary failure', async () => {
  const originalFetch=globalThis.fetch;
  try {
    let called=false;
    globalThis.fetch=async()=>{called=true;return {ok:true,json:async()=>({result:'ok'})} as any};
    const shared=mediaFixture(true);
    assert.equal((await invoke(createMediaDeleteHandler(shared.services),{mediaId:'managed'},{authorization:'Bearer owner','x-firebase-appcheck':'check'})).status,409);
    assert.equal(called,false);
    assert.equal(shared.documents.has('media/managed'),true);

    globalThis.fetch=async()=>({ok:false,json:async()=>({result:'error'})}) as any;
    const failed=mediaFixture(false);
    assert.equal((await invoke(createMediaDeleteHandler(failed.services),{mediaId:'managed'},{authorization:'Bearer owner','x-firebase-appcheck':'check'})).status,502);
    assert.equal(failed.documents.has('media/managed'),true);
    assert.equal(failed.documents.get('cleanupJobs/media-managed').kind,'media-delete');
  } finally { globalThis.fetch=originalFetch; }
});
