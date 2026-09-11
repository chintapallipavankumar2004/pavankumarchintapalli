import { createHmac, randomUUID } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminServices } from './admin';
import { HttpError, bodyObject, json, postOnly, respondError, type Request, type Response } from './http';
import { signUpload } from './signature';
import { validateEnquiry } from '../src/lib/validation';

export type Services = ReturnType<typeof adminServices>;
export function createSignHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      const bearer = /^Bearer (\S+)$/.exec(String(req.headers.authorization || ''))?.[1];
      if (!bearer) throw new HttpError(401, 'Sign in before uploading.');
      const { auth, db } = services();
      let uid: string;
      try { uid = (await auth.verifyIdToken(bearer, true)).uid; } catch { throw new HttpError(401, 'Your session expired. Sign in again.'); }
      if ((await db.doc('access/admin').get()).data()?.uid !== uid) throw new HttpError(403, 'Admin access required.');
      const body = bodyObject(req);
      if (!['image', 'resume'].includes(String(body.kind)) || Object.keys(body).some(key => key !== 'kind')) throw new HttpError(400, 'Invalid upload type.');
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const secret = process.env.CLOUDINARY_API_SECRET;
      const preset = body.kind === 'resume' ? process.env.CLOUDINARY_RESUME_PRESET : process.env.CLOUDINARY_IMAGE_PRESET;
      if (!cloudName || !apiKey || !secret || !preset) throw new HttpError(503, 'Media uploads are not configured.');
      const params = { timestamp: Math.floor(Date.now() / 1000), upload_preset: preset, public_id: `portfolio/${body.kind}/${randomUUID()}`, overwrite: false, allowed_formats: body.kind === 'resume' ? 'pdf' : 'jpg,jpeg,png,webp' };
      json(res, 200, { cloudName, apiKey, params, signature: signUpload(params, secret) });
    } catch (error) { respondError(res, error); }
  };
}

export function createEnquiryHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    try {
      postOnly(req, res);
      const body = bodyObject(req);
      const id = body.id;
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new HttpError(400, 'Invalid submission ID.');
      if (body.website) throw new HttpError(400, 'Unable to accept this enquiry.');
      let enquiry: ReturnType<typeof validateEnquiry>;
      try { enquiry = validateEnquiry(body); } catch (error) { throw new HttpError(400, (error as Error).message); }
      const token = req.headers['x-firebase-appcheck'];
      if (typeof token !== 'string' || !token) throw new HttpError(403, 'Please refresh the page and try again.');
      const { db, appCheck } = services();
      try { await appCheck.verifyToken(token); } catch { throw new HttpError(403, 'Verification failed. Please refresh and try again.'); }
      const salt = process.env.ENQUIRY_RATE_LIMIT_SECRET;
      if (!salt) throw new HttpError(503, 'Enquiries are temporarily unavailable. Please use the email link.');
      // Vercel overwrites x-forwarded-for. Local requests use the socket address.
      const ip = process.env.VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress;
      if (!ip) throw new HttpError(400, 'Unable to verify this request.');
      const hash = (value: string) => createHmac('sha256', salt).update(value).digest('hex');
      const requestHash = hash(JSON.stringify(enquiry));
      const ref = db.doc(`enquiries/${id}`);
      const rateRef = db.doc(`enquiryLimits/${hash(ip)}`);
      await db.runTransaction(async tx => {
        const existing = await tx.get(ref);
        if (existing.exists) {
          if (existing.data()?.requestHash !== requestHash) throw new HttpError(409, 'Submission changed. Please start a new enquiry.');
          return; // A retry after a lost response never creates a duplicate.
        }
        const rate = (await tx.get(rateRef)).data();
        const now = Date.now();
        const activeWindow = rate?.windowStart > now - 3600000;
        const count = activeWindow ? Number(rate.count) : 0;
        if (count >= 5) throw new HttpError(429, 'Too many enquiries. Please try again in an hour or use the email link.');
        tx.set(rateRef, { count: count + 1, windowStart: activeWindow ? rate.windowStart : now, expiresAt: Timestamp.fromMillis(now + 86400000) });
        tx.create(ref, { ...enquiry, status: 'new', createdAt: FieldValue.serverTimestamp(), requestHash });
      });
      json(res, 201, { saved: true, id });
    } catch (error) { respondError(res, error); }
  };
}
