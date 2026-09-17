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
import { projectWriteFields } from '../src/lib/projects.js';
import { DEFAULT_PROJECT_CATEGORIES, categoryIdPattern, normalizeCategory, validateCategory } from '../src/lib/categories.js';
import type { CategoryItem, Project } from '../src/types.js';

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

export function createProjectSaveHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    let stage = 'request';
    try {
      postOnly(req, res);
      stage = 'authorization';
      const { uid, db } = await requireAdmin(req, services());
      const body = bodyObject(req, 65536);
      if (Object.keys(body).some((key) => !['project', 'creating'].includes(key)) || typeof body.creating !== 'boolean' || !body.project || typeof body.project !== 'object' || Array.isArray(body.project)) throw new HttpError(400, 'Invalid project save request.');
      const project = body.project as Project;
      if (typeof project.id !== 'string' || typeof project.slug !== 'string' || project.id !== project.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || project.slug.length > 80 || typeof project.category!=='string' || !categoryIdPattern.test(project.category)) throw new HttpError(400, 'Use a valid project slug and category.');
      stage = 'project-transaction';
      const ref = db.doc(`projects/${project.id}`);
      await db.runTransaction(async (tx) => {
        const [existing,categorySnapshot] = await Promise.all([tx.get(ref),tx.get(db.doc(`categories/${project.category}`))]);
        if (body.creating && existing.exists) throw new HttpError(409, 'This slug is already used. Choose another.');
        if (!body.creating && !existing.exists) throw new HttpError(409, 'This project was deleted. Refresh the catalog.');
        const fallback=DEFAULT_PROJECT_CATEGORIES[project.category];
        if(!categorySnapshot.exists&&!fallback)throw new HttpError(400,'The selected project category no longer exists.');
        const definition=categorySnapshot.exists?normalizeCategory({...categorySnapshot.data(),id:categorySnapshot.id},categorySnapshot.id):fallback;
        if(!definition.enabled&&(body.creating||existing.data()?.category!==project.category))throw new HttpError(400,'The selected project category is disabled.');
        stage = 'validation';
        let fields: ReturnType<typeof projectWriteFields>;
        try { fields = projectWriteFields(project,definition); }
        catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Check the project fields.'); }
        stage = 'project-transaction';
        for (const item of fields.gallery) {
          if (item.ownership !== 'cloudinary-managed') continue;
          const media = await tx.get(db.doc(`media/${item.mediaId}`));
          const value = media.data();
          if (!media.exists || value?.status !== 'active' || value?.ownership !== 'cloudinary-managed' || value?.publicId !== item.publicId || value?.secureUrl !== item.url) throw new HttpError(400, 'A managed gallery image is missing or no longer valid. Upload it again.');
        }
        if (existing.exists) tx.set(db.collection('contentRevisions').doc(), { entityType: 'project', entityId: project.id, snapshot: existing.data(), createdAt: FieldValue.serverTimestamp(), createdBy: uid });
        tx.set(ref, { ...fields, createdAt: existing.data()?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        tx.set(db.collection('auditLogs').doc(), { action: body.creating ? 'project.create' : 'project.update', entityType: 'project', entityId: project.id, adminUid: uid, summary: body.creating ? 'Created project record' : 'Updated project record', result: 'success', createdAt: FieldValue.serverTimestamp() });
      });
      json(res, body.creating ? 201 : 200, { saved: true, id: project.id });
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(`Portfolio project save failed at ${stage}.`);
      if (error instanceof HttpError) return json(res, error.status, { error: error.message, stage });
      return json(res, 503, { error: 'The project could not be saved. Please try again.', stage });
    }
  };
}

export function createProjectReorderHandler(services = adminServices) {
  return async (req: Request, res: Response) => {
    let stage='request';
    try{
      postOnly(req,res);
      stage='authorization';
      const {uid,db}=await requireAdmin(req,services());
      const body=bodyObject(req,2048);
      if(Object.keys(body).some((key)=>!['id','direction'].includes(key))||typeof body.id!=='string'||body.id.length>80||!categoryIdPattern.test(body.id)||![-1,1].includes(Number(body.direction)))throw new HttpError(400,'Invalid project reorder request.');
      stage='project-reorder';
      let ordering:string[]=[];
      await db.runTransaction(async(tx)=>{
        const snapshot=await tx.get(db.collection('projects'));
        if(snapshot.size>400)throw new HttpError(409,'The catalog is too large for this reorder operation.');
        const items=snapshot.docs.map((entry)=>({id:entry.id,order:Number.isInteger(entry.data().order)?entry.data().order:Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
        const index=items.findIndex((item)=>item.id===body.id);
        if(index<0)throw new HttpError(404,'Project not found. Refresh the catalog.');
        const target=index+Number(body.direction);
        if(target>=0&&target<items.length)[items[index],items[target]]=[items[target],items[index]];
        ordering=items.map((item)=>item.id);
        items.forEach((item,order)=>tx.update(db.doc(`projects/${item.id}`),{order,updatedAt:FieldValue.serverTimestamp()}));
        tx.set(db.collection('auditLogs').doc(),{action:'project.reorder',entityType:'project',entityId:String(body.id),adminUid:uid,summary:'Reordered project catalog',result:'success',createdAt:FieldValue.serverTimestamp()});
      });
      json(res,200,{ordering});
    }catch(error){
      if(!(error instanceof HttpError))console.error(`Portfolio project reorder failed at ${stage}.`);
      if(error instanceof HttpError)return json(res,error.status,{error:error.message,stage});
      return json(res,503,{error:'Projects could not be reordered. Please try again.',stage});
    }
  };
}

export function createCategoryManageHandler(services = adminServices) {
  return async(req:Request,res:Response)=>{
    let stage='request';
    try{
      postOnly(req,res);
      stage='authorization';
      const {uid,db}=await requireAdmin(req,services());
      const body=bodyObject(req,32768);
      const action=String(body.action||'');
      if(!['save','publish','unpublish','enable','disable','reorder','delete'].includes(action))throw new HttpError(400,'Invalid category action.');
      stage=`category-${action}`;
      if(action==='save'){
        if(Object.keys(body).some((key)=>!['action','category','creating'].includes(key))||typeof body.creating!=='boolean')throw new HttpError(400,'Invalid category save request.');
        let category:CategoryItem;
        try{category=validateCategory(body.category);}catch(error){throw new HttpError(400,error instanceof Error?error.message:'Check the category fields.');}
        const ref=db.doc(`categories/${category.id}`);
        await db.runTransaction(async(tx)=>{
          const existing=await tx.get(ref);
          if(body.creating&&existing.exists)throw new HttpError(409,'That category ID already exists.');
          if(!body.creating&&!existing.exists)throw new HttpError(404,'This category was deleted. Refresh the list.');
          if(existing.exists)tx.set(db.collection('contentRevisions').doc(),{entityType:'category',entityId:category.id,snapshot:existing.data(),createdAt:FieldValue.serverTimestamp(),createdBy:uid});
          tx.set(ref,{...category,createdAt:existing.data()?.createdAt||FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),updatedBy:uid});
          tx.set(db.collection('auditLogs').doc(),{action:body.creating?'category.create':'category.update',entityType:'category',entityId:category.id,adminUid:uid,summary:body.creating?'Created project category':'Updated project category',result:'success',createdAt:FieldValue.serverTimestamp()});
        });
        return json(res,body.creating?201:200,{saved:true,id:category.id});
      }
      if(typeof body.id!=='string'||body.id.length>60||!categoryIdPattern.test(body.id)||Object.keys(body).some((key)=>!['action','id','direction'].includes(key)))throw new HttpError(400,'Invalid category request.');
      const ref=db.doc(`categories/${body.id}`);
      if(action==='reorder'){
        if(![-1,1].includes(Number(body.direction)))throw new HttpError(400,'Invalid category direction.');
        let ordering:string[]=[];
        await db.runTransaction(async(tx)=>{
          const snapshot=await tx.get(db.collection('categories'));
          if(snapshot.size>400)throw new HttpError(409,'There are too many categories for this reorder operation.');
          const items=snapshot.docs.map((entry)=>({id:entry.id,order:Number.isInteger(entry.data().order)?entry.data().order:Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
          const index=items.findIndex((item)=>item.id===body.id);
          if(index<0)throw new HttpError(404,'Category not found. Refresh the list.');
          const target=index+Number(body.direction);
          if(target>=0&&target<items.length)[items[index],items[target]]=[items[target],items[index]];
          ordering=items.map((item)=>item.id);
          items.forEach((item,order)=>tx.update(db.doc(`categories/${item.id}`),{order,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid}));
          tx.set(db.collection('auditLogs').doc(),{action:'category.reorder',entityType:'category',entityId:String(body.id),adminUid:uid,summary:'Reordered project categories',result:'success',createdAt:FieldValue.serverTimestamp()});
        });
        return json(res,200,{ordering});
      }
      await db.runTransaction(async(tx)=>{
        const existing=await tx.get(ref);
        if(!existing.exists)throw new HttpError(404,'Category not found. Refresh the list.');
        const linked=action==='delete'?await tx.get(db.collection('projects').where('category','==',body.id).limit(1)):null;
        tx.set(db.collection('contentRevisions').doc(),{entityType:'category',entityId:String(body.id),snapshot:existing.data(),createdAt:FieldValue.serverTimestamp(),createdBy:uid});
        if(action==='delete'){
          if(DEFAULT_PROJECT_CATEGORIES[String(body.id)])throw new HttpError(409,'Core categories can be disabled or unpublished instead of deleted.');
          if(linked&&!linked.empty)throw new HttpError(409,`${linked.size} or more projects use this category. Reassign them before deleting it.`);
          tx.delete(ref);
        }else{
          const updates=action==='publish'?{published:true}:action==='unpublish'?{published:false}:action==='enable'?{enabled:true}:{enabled:false};
          tx.update(ref,{...updates,updatedAt:FieldValue.serverTimestamp(),updatedBy:uid});
        }
        const summaries:Record<string,string>={publish:'Published project category',unpublish:'Unpublished project category',enable:'Enabled project category',disable:'Disabled project category',delete:'Deleted unused project category'};
        tx.set(db.collection('auditLogs').doc(),{action:`category.${action}`,entityType:'category',entityId:String(body.id),adminUid:uid,summary:summaries[action],result:'success',createdAt:FieldValue.serverTimestamp()});
      });
      json(res,200,action==='delete'?{deleted:true,id:body.id}:{saved:true,id:body.id});
    }catch(error){
      if(!(error instanceof HttpError))console.error(`Portfolio category action failed at ${stage}.`);
      if(error instanceof HttpError)return json(res,error.status,{error:error.message,stage});
      return json(res,503,{error:'The category action could not be completed. Please try again.',stage});
    }
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
