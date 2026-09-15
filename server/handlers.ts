import { createHmac, randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminServices } from './admin.js';
import {
  HttpError,
  bodyObject,
  json,
  postOnly,
  respondError,
  type Request,
  type Response,
} from './http.js';
import { signUpload } from './signature.js';
import { validateEnquiry } from '../src/lib/validation.js';

export type Services = ReturnType<typeof adminServices>;
async function requireAdmin(req: Request, services: Services) {
  const bearer = /^Bearer (\S+)$/.exec(String(req.headers.authorization || ''))?.[1];
  if (!bearer) throw new HttpError(401, 'Sign in before continuing.');
  const { auth, appCheck, db } = services;
  let uid = '';
  try { uid = (await auth.verifyIdToken(bearer, true)).uid; } catch { throw new HttpError(401, 'Your session expired. Sign in again.'); }
  const check = req.headers['x-firebase-appcheck'];
  if (typeof check !== 'string' || !check) throw new HttpError(403, 'App verification required.');
  try { await appCheck.verifyToken(check); } catch { throw new HttpError(403, 'App verification failed.'); }
  const grant = (await db.doc('access/admin').get()).data();
  const claimed = (await auth.getUser(uid)).customClaims?.admin === true;
  if (grant?.uid !== uid && !claimed) throw new HttpError(403, 'Admin access required.');
  return { uid, db };
}
export function createSignHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      await requireAdmin(req, services());
      const body = bodyObject(req);
      if (
        !['image', 'resume'].includes(String(body.kind)) ||
        Object.keys(body).some((key) => key !== 'kind')
      )
        throw new HttpError(400, 'Invalid upload type.');
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const secret = process.env.CLOUDINARY_API_SECRET;
      const preset =
        body.kind === 'resume'
          ? process.env.CLOUDINARY_RESUME_PRESET
          : process.env.CLOUDINARY_IMAGE_PRESET;
      if (!cloudName || !apiKey || !secret || !preset)
        throw new HttpError(503, 'Media uploads are not configured.');
      const params = {
        timestamp: Math.floor(Date.now() / 1000),
        upload_preset: preset,
        public_id: `portfolio/${body.kind}/${randomUUID()}`,
        overwrite: false,
        allowed_formats: body.kind === 'resume' ? 'pdf' : 'jpg,jpeg,png,webp',
      };
      json(res, 200, { cloudName, apiKey, params, signature: signUpload(params, secret) });
    } catch (error) {
      respondError(res, error);
    }
  };
}

export function createMediaCompleteHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      const { uid, db } = await requireAdmin(req, services());
      const b = bodyObject(req);
      const allowed = ['asset_id','public_id','resource_type','type','format','version','secure_url','bytes','width','height','original_filename'];
      if (Object.keys(b).some(k => !allowed.includes(k)) || typeof b.asset_id !== 'string' || typeof b.public_id !== 'string' || typeof b.secure_url !== 'string' || !String(b.secure_url).startsWith('https://res.cloudinary.com/')) throw new HttpError(400, 'Invalid Cloudinary upload result.');
      if (!String(b.public_id).startsWith('portfolio/')) throw new HttpError(400, 'Media folder is not allowed.');
      const id = String(b.asset_id);
      const record = { assetId: id, publicId: b.public_id, resourceType: b.resource_type, deliveryType: b.type || 'upload', format: b.format, version: b.version, secureUrl: b.secure_url, bytes: b.bytes, width: b.width || null, height: b.height || null, originalFilename: b.original_filename || '', folder: String(b.public_id).split('/').slice(0,-1).join('/'), ownership: 'cloudinary-managed', status: 'active', createdAt: FieldValue.serverTimestamp(), createdBy: uid };
      await db.runTransaction(async tx => { tx.set(db.doc(`media/${id}`), record); tx.set(db.collection('auditLogs').doc(), { action:'media.upload', entityType:'media', entityId:id, adminUid:uid, summary:'Registered managed upload', result:'success', createdAt:FieldValue.serverTimestamp() }); });
      json(res, 201, { media: { ...record, createdAt: undefined } });
    } catch (error) { respondError(res, error); }
  };
}

export function createMediaDeleteHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      const { uid, db } = await requireAdmin(req, services());
      const b = bodyObject(req);
      if (Object.keys(b).some(k => !['mediaId'].includes(k)) || typeof b.mediaId !== 'string') throw new HttpError(400, 'Invalid media request.');
      const ref = db.doc(`media/${b.mediaId}`); const jobRef = db.collection('cleanupJobs').doc(`media-${b.mediaId}`); const snap = await ref.get();
      if (!snap.exists) { await jobRef.delete().catch(()=>{}); return json(res, 200, { deleted: true, alreadyDeleted: true }); }
      const media = snap.data()!;
      const uses = await Promise.all([db.collection('projects').where('mediaIds','array-contains',b.mediaId).limit(1).get(), db.collection('siteContent').where('mediaIds','array-contains',b.mediaId).limit(1).get()]);
      if (uses.some(q=>!q.empty)) throw new HttpError(409, 'This media is still in use.');
      if (media.ownership !== 'cloudinary-managed') { await db.runTransaction(async tx=>{tx.delete(ref);tx.delete(jobRef);tx.set(db.collection('auditLogs').doc(),{action:'media.reference-delete',entityType:'media',entityId:b.mediaId,adminUid:uid,summary:'Removed external media reference',result:'success',createdAt:FieldValue.serverTimestamp()})}); return json(res, 200, { deleted: true, referenceOnly: true }); }
      const secret=process.env.CLOUDINARY_API_SECRET, key=process.env.CLOUDINARY_API_KEY, cloud=process.env.CLOUDINARY_CLOUD_NAME;
      if (!secret||!key||!cloud) throw new HttpError(503,'Media deletion is not configured.');
      const timestamp=Math.floor(Date.now()/1000); const params={ invalidate:'true', public_id:media.publicId, timestamp };
      const form=new URLSearchParams({ invalidate:'true', public_id:String(media.publicId), timestamp:String(timestamp), api_key:key, signature:signUpload(params,secret) });
      const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/${encodeURIComponent(media.resourceType||'image')}/destroy`,{method:'POST',body:form});
      const result=await response.json() as {result?:string};
      if (!response.ok || !['ok','not found'].includes(result.result||'')) { const job=db.collection('cleanupJobs').doc(`media-${b.mediaId}`); await job.set({ kind:'media-delete', mediaId:b.mediaId, publicId:media.publicId, resourceType:media.resourceType, status:'failed', attempts:FieldValue.increment(1), updatedAt:FieldValue.serverTimestamp(), createdBy:uid },{merge:true}); throw new HttpError(502,'Cloudinary deletion failed. A cleanup retry was created.'); }
      await db.runTransaction(async tx=>{tx.delete(ref);tx.delete(jobRef);tx.set(db.collection('auditLogs').doc(),{action:'media.delete',entityType:'media',entityId:b.mediaId,adminUid:uid,summary:'Deleted managed media',result:'success',createdAt:FieldValue.serverTimestamp()});});
      json(res,200,{deleted:true});
    } catch(error){respondError(res,error);}
  };
}

export function createEnquiryHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      const body = bodyObject(req);
      const id = body.id;
      if (
        typeof id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
      )
        throw new HttpError(400, 'Invalid submission ID.');
      if (body.website) throw new HttpError(400, 'Unable to accept this enquiry.');
      let enquiry: ReturnType<typeof validateEnquiry>;
      try {
        enquiry = validateEnquiry(body, [String(body.service)]);
      } catch (error) {
        throw new HttpError(400, (error as Error).message);
      }
      const token = req.headers['x-firebase-appcheck'];
      if (typeof token !== 'string' || !token)
        throw new HttpError(403, 'Please refresh the page and try again.');
      const { db, appCheck } = services();
      try {
        await appCheck.verifyToken(token);
      } catch {
        throw new HttpError(403, 'Verification failed. Please refresh and try again.');
      }
      const serviceRecord = await db.doc(`services/${enquiry.service}`).get();
      if (!serviceRecord.exists || serviceRecord.data()?.published !== true) throw new HttpError(400, 'Choose an available service.');
      const salt = process.env.ENQUIRY_RATE_LIMIT_SECRET;
      if (!salt)
        throw new HttpError(
          503,
          'Enquiries are temporarily unavailable. Please use the email link.',
        );
      // Vercel overwrites x-forwarded-for. Local requests use the socket address.
      const ip = process.env.VERCEL
        ? String(req.headers['x-forwarded-for'] || '')
            .split(',')[0]
            .trim()
        : req.socket.remoteAddress;
      if (!ip) throw new HttpError(400, 'Unable to verify this request.');
      const hash = (value: string) => createHmac('sha256', salt).update(value).digest('hex');
      const requestHash = hash(JSON.stringify(enquiry));
      const ref = db.doc(`enquiries/${id}`);
      const rateRef = db.doc(`enquiryLimits/${hash(ip)}`);
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) {
          if (existing.data()?.requestHash !== requestHash)
            throw new HttpError(409, 'Submission changed. Please start a new enquiry.');
          return; // A retry after a lost response never creates a duplicate.
        }
        const rate = (await tx.get(rateRef)).data() || {};
        const now = Date.now();
        const activeWindow = rate?.windowStart > now - 3600000;
        const count = activeWindow ? Number(rate.count) : 0;
        if (count >= 5)
          throw new HttpError(
            429,
            'Too many enquiries. Please try again in an hour or use the email link.',
          );
        tx.set(rateRef, {
          count: count + 1,
          windowStart: activeWindow ? rate.windowStart : now,
          expiresAt: Timestamp.fromMillis(now + 86400000),
        });
        tx.create(ref, {
          ...enquiry,
          status: 'new',
          createdAt: FieldValue.serverTimestamp(),
          requestHash,
        });
      });
      json(res, 201, { saved: true, id });
    } catch (error) {
      respondError(res, error);
    }
  };
}
