import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { validateEnquiry, slugify, httpsUrl, pdfUrl } from '../src/lib/validation';
import { parseRoute } from '../src/lib/routes';
import { signUpload } from '../server/signature';
import { createSignHandler, createEnquiryHandler, type Services } from '../server/handlers';
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
    multipart: [{ headers: { 'Content-Type': 'text/plain' }, body: 'test' }],
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
  const documents = new Map<string, any>([['access/admin', { uid: 'owner' }]]);
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
        { authorization: 'Bearer user' },
      )
    ).status,
    403,
  );
});
test('sign endpoint signs only fixed parameters and never returns the secret', async () => {
  const f = fixture();
  const handler = createSignHandler(f.services);
  const result = await invoke(handler, { kind: 'image' }, { authorization: 'Bearer owner' });
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
        { authorization: 'Bearer owner' },
      )
    ).status,
    400,
  );
  const pdf = await invoke(handler, { kind: 'resume' }, { authorization: 'Bearer owner' });
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
